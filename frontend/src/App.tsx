import { useEffect, useState } from 'react';
import Modal from './components/Modal.js';
import MemberPicker from './components/MemberPicker.js';
import RoundDialog from './components/RoundDialog.js';
import RoundCard from './components/RoundCard.js';
import Avatar from './components/Avatar.js';
import Icon from './components/Icon.js';
import { api } from './services/api.js';
import { speakScores } from './utils/sound.js';
import { fmtDay, fmtSigned } from './utils/format.js';
import type { Game, Player } from './types/index.js';

interface GrandTotal {
  playerId: string;
  name: string;
  tongThuChi: number;
  soVan: number;
}

function todayStr(): string {
  const t = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [totals, setTotals] = useState<GrandTotal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Game | null>(null);
  const [roundOpen, setRoundOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [gameMenu, setGameMenu] = useState(false);
  const [membersOpen, setMembersOpen] = useState(true);
  const [roundsOpen, setRoundsOpen] = useState(true);
  const [popup, setPopup] = useState<null | 'game'>(null);
  const [newGameDate, setNewGameDate] = useState(todayStr());
  const [checked, setChecked] = useState<string[]>([]);
  const [memberOpen, setMemberOpen] = useState(false);
  const [mName, setMName] = useState('');
  const [mAvatar, setMAvatar] = useState<string | undefined>(undefined);
  const [mErr, setMErr] = useState<string | null>(null);
  const [hideTotals, setHideTotals] = useState(() => {
    try {
      const v = localStorage.getItem('hideTotals');
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });
  const [err, setErr] = useState<string | null>(null);
  const [errDlg, setErrDlg] = useState<string | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ msg: string; run: () => void } | null>(null);
  const [renameDlg, setRenameDlg] = useState<{ pid: string; name: string } | null>(null);

  async function loadAll(selectId?: string | null) {
    try {
      const [ps, gs, ts] = await Promise.all([api.players(), api.games(), api.totals()]);
      setPlayers(ps);
      setGames(gs);
      setTotals(ts);
      const sid = selectId !== undefined ? selectId : selectedId;
      if (sid) {
        const g = await api.game(sid).catch(() => null);
        setDetail(g);
        if (!g) setSelectedId(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Tải dữ liệu thất bại');
    }
  }

  useEffect(() => { loadAll(); }, []);

  function toggleHide() {
    setHideTotals((v) => {
      try { localStorage.setItem('hideTotals', v ? '0' : '1'); } catch { /* ignore */ }
      return !v;
    });
  }

  function openGame(id: string) {
    setSelectedId(id);
    setGameMenu(false);
    loadAll(id);
  }

  const nameOf = (pid: string) => players.find((p) => p.id === pid)?.name ?? pid.slice(0, 6);
  const nghi = new Set(detail?.nghiIds ?? []);
  const inGame = players.filter((p) => detail?.playerIds.includes(p.id));
  const playing = inGame.filter((p) => !nghi.has(p.id));
  const totalsOf = (pid: string) => {
    if (!detail) return totals.find((t) => t.playerId === pid)?.tongThuChi ?? 0;
    return detail.rounds.reduce((a, r) => a + (r.ketQua.find((k) => k.playerId === pid)?.tong ?? 0), 0);
  };
  const rounds = detail ? [...detail.rounds].reverse() : [];
  const day = (iso?: string) => {
    if (!iso) return '';
    // ngayChoi dang YYYY-MM-DD can gio; createdAt ISO day du thi giu nguyen
    return fmtDay(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T00:00:00' : iso);
  };

  /** Bat/tat trang thai dang choi (toi thieu 2 nguoi choi) */
  async function togglePlaying(pid: string) {
    if (!detail) return;
    const next = nghi.has(pid)
      ? (detail.nghiIds ?? []).filter((x) => x !== pid)
      : [...(detail.nghiIds ?? []), pid];
    if (detail.playerIds.length - next.length < 2) {
      setErrDlg('Bàn phải có ít nhất 2 người đang chơi.');
      return;
    }
    await api.updateGame(detail.id, { nghiIds: next });
    loadAll(detail.id);
  }

  function tryOpenRound() {
    if (!detail) return;
    if (playing.length < 2) {
      setErrDlg('Cần ít nhất 2 người đang chơi.');
      return;
    }
    setRoundOpen(true);
  }

  async function saveRound(scores: { playerId: string; amount: number }[]) {
    if (!detail) return;
    await api.addRound(detail.id, { scores });
    speakScores(scores.map((s) => ({ name: nameOf(s.playerId), amount: s.amount })));
    setRoundOpen(false);
    loadAll(detail.id);
  }

  /** Sua ca hang diem 1 van (validate tong=0) */
  async function editRow(roundId: string, scores: { playerId: string; amount: number; hang?: number }[]) {
    if (!detail) return;
    await api.updateRound(detail.id, roundId, { scores });
    loadAll(detail.id);
  }

  async function deleteRound(roundId: string, label: string) {
    if (!detail) return;
    setConfirmDlg({
      msg: `Xóa ván lúc ${label}?`,
      run: async () => {
        if (!detail) return;
        await api.deleteRound(detail.id, roundId);
        loadAll(detail.id);
      },
    });
  }

  function speakRound(roundId: string) {
    if (!detail) return;
    const round = detail.rounds.find((r) => r.id === roundId);
    if (!round) return;
    speakScores(round.ketQua.map((k) => ({ name: nameOf(k.playerId), amount: k.tong })));
  }

  /** Ten ban tu dong: Ban N (tang dan, bo qua ten da ton tai) */
  function nextTableName(): string {
    const names = new Set(games.map((g) => g.name));
    let n = games.length + 1;
    while (names.has(`Bàn ${n}`)) n++;
    return `Bàn ${n}`;
  }

  async function createGame() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newGameDate)) {
      setErrDlg('Ngày chơi chưa đúng.');
      return;
    }
    if (checked.length < 2) {
      setErrDlg('Chọn ít nhất 2 người.');
      return;
    }
    if (checked.length > 4) {
      setErrDlg('Tối đa 4 người một bàn.');
      return;
    }
    const g = await api.createGame({ name: nextTableName(), playerIds: checked, ngayChoi: newGameDate });
    setNewGameDate(todayStr());
    setChecked([]);
    setPopup(null);
    setSelectedId(g.id);
    loadAll(g.id);
  }

  async function renameMemberInCreate(pid: string, oldName: string) {
    setRenameDlg({ pid, name: oldName });
  }

  async function deleteMemberInCreate(pid: string, name: string) {
    setConfirmDlg({
      msg: `Xóa thành viên "${name}" khỏi app?`,
      run: async () => {
        try {
          await api.deletePlayer(pid);
          setChecked((c) => c.filter((x) => x !== pid));
          loadAll();
        } catch (e) {
          setErrDlg(e instanceof Error ? e.message : 'Xóa thất bại');
        }
      },
    });
  }

  async function saveRename() {
    if (!renameDlg) return;
    if (!renameDlg.name.trim()) {
      setErrDlg('Nhập tên mới.');
      return;
    }
    try {
      await api.updatePlayer(renameDlg.pid, { name: renameDlg.name.trim() });
      setRenameDlg(null);
      loadAll();
    } catch (e) {
      setErrDlg(e instanceof Error ? e.message : 'Đổi tên thất bại');
    }
  }

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setMErr('Chỉ chọn file ảnh');
      return;
    }
    const rd = new FileReader();
    rd.onload = () => {
      const url = String(rd.result ?? '');
      if (url.length > 550000) {
        setMErr('Ảnh quá lớn (tối đa ~400KB)');
        return;
      }
      setMErr(null);
      setMAvatar(url);
    };
    rd.readAsDataURL(f);
  }

  async function saveMember() {
    if (!mName.trim()) {
      setMErr('Nhập tên người chơi');
      return;
    }
    setMErr(null);
    try {
      const p = await api.createPlayer(mName.trim(), mAvatar);
      setMemberOpen(false);
      setMName('');
      setMAvatar(undefined);
      await loadAll();
      setChecked((c) => (c.length < 4 && !c.includes(p.id) ? [...c, p.id] : c));
    } catch (e) {
      setMErr(e instanceof Error ? e.message : 'Thêm thất bại');
    }
  }

  async function deleteGameById(id: string, name: string) {
    setConfirmDlg({
      msg: `Xóa bàn "${name}"?`,
      run: async () => {
        await api.deleteGame(id);
        if (selectedId === id) {
          setSelectedId(null);
          setDetail(null);
          loadAll(null);
        } else {
          loadAll();
        }
      },
    });
  }

  /** Chot danh sach thanh vien (OK moi ap dung) */
  async function confirmMembers(ids: string[]) {
    if (!detail) return;
    if (ids.length < 2) {
      setErrDlg('Bàn phải có ít nhất 2 người.');
      return;
    }
    if (ids.length > 4) {
      setErrDlg('Bàn tối đa 4 người.');
      return;
    }
    const removed = detail.playerIds.filter((x) => !ids.includes(x));
    const blocked = removed.find((pid) => detail.rounds.some((r) => r.ketQua.some((k) => k.playerId === pid)));
    if (blocked) {
      setErrDlg('Thành viên này đã có điểm trong bàn, không thể bỏ chọn.');
      return;
    }
    setPickerOpen(false);
    await api.updateGame(detail.id, { playerIds: ids });
    loadAll(detail.id);
  }

  return (
    <div className="desk">
      <header className="bar">
        <span className="bar-logo"><Icon name="cards" size={26} /></span>
        <b className="bar-title">Tiến Lên Tính Tiền</b>
        <span className="spacer" style={{ flex: 1 }} />
        <span className="menuwrap grow1">
          <button className="bar-selectbtn" onClick={() => setGameMenu(!gameMenu)}>
            <Icon name="calendar" size={16} /> {detail ? `${detail.name} - ${day(detail.ngayChoi ?? detail.createdAt)}` : '-- Chọn bàn --'} <Icon name="chevronDown" size={16} />
          </button>
          {gameMenu && (
            <div className="ctx big">
              {games.map((g) => (
                <div key={g.id} className="grow">
                  <button className={g.id === selectedId ? 'on' : ''} onClick={() => openGame(g.id)}>
                    {g.id === selectedId && <Icon name="check" size={14} />} {g.name} - {day(g.ngayChoi ?? g.createdAt)}
                  </button>
                  <button
                    className="trash"
                    title={`Xóa bàn "${g.name}"`}
                    onClick={(e) => { e.stopPropagation(); setGameMenu(false); deleteGameById(g.id, g.name); }}
                  ><Icon name="trash" size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </span>
        <button className="bar-btn bar-add" onClick={() => setPopup('game')} title="Thêm bàn mới"><Icon name="plus" size={16} /> Thêm</button>
      </header>

      {err && <p className="error">{err}</p>}

      <div className="layout1">
        <main className="center">
          <button className="bigadd" disabled={!detail} onClick={tryOpenRound}><Icon name="plus" size={20} /> THÊM VÁN MỚI</button>

          {!detail && <div className="panel"><p className="muted">Chọn một bàn để xem chi tiết.</p></div>}

          {detail && (
            <div className="panel">
              <div className="row between" onClick={() => setMembersOpen(!membersOpen)} style={{ cursor: 'pointer' }}>
                <div>
                  <h3 style={{ margin: 0 }}><Icon name="users" /> Chi tiết bàn chơi</h3>
                  <span className="muted">{detail.name} - {day(detail.ngayChoi ?? detail.createdAt)}</span>
                </div>
                <span className="chev"><Icon name={membersOpen ? 'chevronDown' : 'chevronRight'} /></span>
              </div>
              {membersOpen && (
                <>
                  <div className="hm-avrow">
                    {inGame.map((p) => {
                      const on = !nghi.has(p.id);
                      return (
                        <div className="hm-av" key={p.id} onClick={() => togglePlaying(p.id)} title="Bấm để đổi trạng thái">
                          <Avatar id={p.id} name={p.name} size={56} src={p.avatar} playing={on} />
                          <span className="hm-avname">{p.name}</span>
                          <span className={on ? 'pill on' : 'pill'}>{on ? 'Đang chơi' : 'Nghỉ'}</span>
                        </div>
                      );
                    })}
                    {inGame.length < 4 && (
                      <div className="hm-av">
                        <button className="hm-plus" onClick={() => setPickerOpen(true)} title="Thêm thành viên"><Icon name="plus" size={24} /></button>
                        <span className="hm-avname">Thêm</span>
                      </div>
                    )}
                  </div>
                  <div className="totbox">
                    <div className="row between">
                      <h4 style={{ margin: 0 }}><Icon name="trophy" /> Tổng tiền hiện tại</h4>
                      <button className="iconbtn" onClick={toggleHide} title={hideTotals ? 'Hiện số tiền' : 'Ẩn số tiền'}>
                        <Icon name={hideTotals ? 'eyeOff' : 'eye'} size={20} />
                      </button>
                    </div>
                    <div className="totgrid" style={{ gridTemplateColumns: `repeat(${inGame.length}, minmax(0, 1fr))` }}>
                      {inGame.map((p) => {
                        const t = totalsOf(p.id);
                        return (
                          <div className="totcell" key={p.id}>
                            <span>{p.name}</span>
                            {hideTotals ? (
                              <span className="masked">••••</span>
                            ) : (
                              <b className={t >= 0 ? 'pos' : 'neg'}>{fmtSigned(t)}</b>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {detail && (
            <div className="panel">
              <div className="row between" onClick={() => setRoundsOpen(!roundsOpen)} style={{ cursor: 'pointer' }}>
                <h3 style={{ margin: 0 }}><Icon name="list" /> Danh sách ván</h3>
                <span><span className="count">{detail.rounds.length} ván</span> <span className="chev"><Icon name={roundsOpen ? 'chevronDown' : 'chevronRight'} /></span></span>
              </div>
              {roundsOpen && (
                <div className="rounds">
                  {rounds.length === 0 && <p className="muted">Chưa có ván nào. Bấm "THÊM VÁN MỚI" bên trên.</p>}
                  {rounds.map((r) => (
                    <RoundCard
                      key={r.id}
                      round={r}
                      members={inGame}
                      nameOf={nameOf}
                      onSpeak={speakRound}
                      onCommitRow={editRow}
                      onDelete={deleteRound}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {errDlg && (
        <div className="overlay over2" onClick={() => setErrDlg(null)}>
          <div className="popup narrow" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h3>Không thể thực hiện</h3>
              <button className="iconbtn" onClick={() => setErrDlg(null)} aria-label="Đóng"><Icon name="x" /></button>
            </div>
            <p>{errDlg}</p>
            <button className="redbtn block" onClick={() => setErrDlg(null)}>Đã hiểu</button>
          </div>
        </div>
      )}

      {confirmDlg && (
        <div className="overlay over2" onClick={() => setConfirmDlg(null)}>
          <div className="popup narrow" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h3>Xác nhận</h3>
              <button className="iconbtn" onClick={() => setConfirmDlg(null)} aria-label="Đóng"><Icon name="x" /></button>
            </div>
            <p>{confirmDlg.msg}</p>
            <div className="frow2">
              <button className="ghostbtn" onClick={() => setConfirmDlg(null)}>Hủy</button>
              <button className="redbtn" onClick={() => { const r = confirmDlg.run(); setConfirmDlg(null); void r; }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {renameDlg && (
        <div className="overlay over2" onClick={() => setRenameDlg(null)}>
          <div className="popup narrow" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h3>Đổi tên thành viên</h3>
              <button className="iconbtn" onClick={() => setRenameDlg(null)} aria-label="Đóng"><Icon name="x" /></button>
            </div>
            <div className="field"><label>Tên mới:</label>
              <input
                autoFocus
                value={renameDlg.name}
                onChange={(e) => setRenameDlg({ ...renameDlg, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
              />
            </div>
            <div className="frow2">
              <button className="ghostbtn" onClick={() => setRenameDlg(null)}>Hủy</button>
              <button className="redbtn" onClick={saveRename}>OK</button>
            </div>
          </div>
        </div>
      )}

      {roundOpen && detail && (
        <RoundDialog
          members={playing}
          onClose={() => setRoundOpen(false)}
          onSave={saveRound}
        />
      )}

      {pickerOpen && (
        <MemberPicker
          key={(detail?.id ?? 'none') + (detail?.playerIds.join(',') ?? '')}
          players={players}
          inGameIds={detail?.playerIds ?? []}
          canToggle={!!detail}
          onConfirm={confirmMembers}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {popup === 'game' && (
        <Modal title="Tạo bàn chơi" onClose={() => setPopup(null)}>
          <p className="muted">Tạo bàn mới, chọn ngày và thành viên. Tên bàn tự động: <b>{nextTableName()}</b></p>
          <div className="field"><label>Ngày chơi:</label><input type="date" value={newGameDate} onChange={(e) => setNewGameDate(e.target.value)} /></div>
          <div className="field"><label>Thành viên: ({checked.length}/4)</label>
            <div className="chips">
              {players.map((p) => {
                const on = checked.includes(p.id);
                const full = !on && checked.length >= 4;
                return (
                  <span className="pchip" key={p.id}>
                    <button
                      className={`pick ${on ? 'on' : ''}`}
                      disabled={full}
                      title={full ? 'Bàn đã đủ 4 người' : (on ? 'Bỏ chọn' : 'Chọn')}
                      onClick={() => setChecked(on ? checked.filter((x) => x !== p.id) : [...checked, p.id])}
                    >
                      <Avatar id={p.id} name={p.name} size={28} src={p.avatar} />
                      <span className="pname">{p.name}</span>
                      {on && <b className="tick"><Icon name="check" size={14} /></b>}
                    </button>
                    <button
                      className="mini"
                      title={`Đổi tên ${p.name}`}
                      onClick={() => renameMemberInCreate(p.id, p.name)}
                    ><Icon name="edit" size={15} /></button>
                    <button
                      className="trash sm"
                      title={`Xóa thành viên ${p.name}`}
                      onClick={() => deleteMemberInCreate(p.id, p.name)}
                    ><Icon name="trash" size={15} /></button>
                  </span>
                );
              })}
              <button className="dashadd" onClick={() => { setMName(''); setMAvatar(undefined); setMemberOpen(true); }}><Icon name="plus" size={16} /> Thêm thành viên</button>
            </div>
            <p className="muted">Chọn thành viên có sẵn hoặc thêm mới. Tối thiểu 2 người, tối đa 4 người.</p>
          </div>
          <div className="frow2">
            <button className="ghostbtn" onClick={() => setPopup(null)}>Hủy</button>
            <button className="redbtn" onClick={createGame}>Tạo bàn</button>
          </div>
        </Modal>
      )}

      {memberOpen && (
        <div className="overlay over2" onClick={() => setMemberOpen(false)}>
          <div className="popup narrow" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h3>Thêm thành viên</h3>
              <button className="iconbtn" onClick={() => setMemberOpen(false)} aria-label="Đóng"><Icon name="x" /></button>
            </div>
            <div className="photoview">
              <label className="photo">
                {mAvatar ? (
                  <img src={mAvatar} alt="anh" />
                ) : (
                  <span className="cam"><Icon name="camera" size={30} /></span>
                )}
                <input type="file" accept="image/*" hidden onChange={pickAvatar} />
              </label>
              <span className="muted">Thêm ảnh đại diện<br />(tùy chọn)</span>
            </div>
            <div className="field"><label>Tên người chơi:</label>
              <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Nhập tên người chơi" />
            </div>
            {mErr && <p className="error">{mErr}</p>}
            <button className="redbtn block" onClick={saveMember}>Thêm thành viên</button>
            <button className="ghostbtn block" onClick={() => setMemberOpen(false)}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}

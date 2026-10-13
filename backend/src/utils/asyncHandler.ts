import type { NextFunction, Request, Response } from 'express';

/** Wrap async handler: Express 4 khong tu bat loi async -> tra 500 JSON thay vi treo */
export function ah(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch((e: unknown) => {
      console.error('[api] handler error:', e);
      if (res.headersSent) return next(e);
      res.status(500).json({ message: e instanceof Error ? e.message : 'Lỗi máy chủ' });
    });
  };
}

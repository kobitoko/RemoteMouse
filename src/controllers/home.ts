import { Request, Response } from "express";
/**
 * GET /
 * Home page.
 */
export const index = async (req: Request, res: Response) => {
    res.render("client", {
        title: "client"
    });
};

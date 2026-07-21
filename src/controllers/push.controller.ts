import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { pushTokenSchema } from "../validators/finance.schemas.js";

export const registerPushToken: RequestHandler = async (req, res) => {
  const input = pushTokenSchema.parse(req.body);

  const token = await prisma.pushToken.upsert({
    where: { token: input.token },
    update: {
      userId: req.userId!,
      platform: input.platform
    },
    create: {
      userId: req.userId!,
      token: input.token,
      platform: input.platform
    }
  });

  res.status(201).json({ success: true, data: token });
};

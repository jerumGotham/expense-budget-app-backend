import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { UpdateAccountInput } from "../validators/auth.schemas.js";

const signToken = (userId: string): string =>
  jwt.sign(
    {
      sub: userId,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );

export const authService = {
  async register(input: { name?: string; email: string; password: string }) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existing) {
      throw new ApiError(409, "Email is already registered.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name?.trim(),

        email: normalizedEmail,

        passwordHash,

        profile: {
          create: {
            income: 0,
            currency: "USD",
            period: "MONTHLY",
            monthlyStartDay: 1,
            weeklyStartDay: 1,
          },
        },

        funds: {
          create: [
            {
              type: "SAVINGS",
              name: "Savings",
              percentage: 50,
            },
            {
              type: "EMERGENCY",
              name: "Emergency Fund",
              percentage: 35,
            },
            {
              type: "LUXE",
              name: "Luxe Fund",
              percentage: 15,
            },
          ],
        },
      },

      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      user,
      accessToken: signToken(user.id),
    };
  },

  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: {
        email: input.email.trim().toLowerCase(),
      },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password.");
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },

      accessToken: signToken(user.id),
    };
  },

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    return {
      user,
    };
  },

  async updateAccount(userId: string, input: UpdateAccountInput) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    const data: Prisma.UserUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }

    if (input.newPassword) {
      if (!input.currentPassword) {
        throw new ApiError(422, "Current password is required.");
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new ApiError(400, "Current password is incorrect.");
      }

      const isSamePassword = await bcrypt.compare(
        input.newPassword,
        user.passwordHash,
      );

      if (isSamePassword) {
        throw new ApiError(
          422,
          "New password must be different from the current password.",
        );
      }

      data.passwordHash = await bcrypt.hash(input.newPassword, 12);
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError(422, "No account changes were provided.");
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

      data,

      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      user: updatedUser,
    };
  },
};

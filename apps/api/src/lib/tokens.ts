import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";
import type { Role } from "@dnd/shared";

export interface AccessTokenPayload {
  sub: string;
  businessId: string;
  branchId: string | null;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  businessId: string;
  tokenVersion?: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.refreshSecret, {
    expiresIn: config.refreshExpiresIn,
  } as SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.refreshSecret) as RefreshTokenPayload;
}

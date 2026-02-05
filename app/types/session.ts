import type { Session } from 'next-auth';

export interface ISession {
    user: Session;
    sub: string;
    expires: number;
    expiresAt: number;
}

export interface IToken {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresAt: number;
}

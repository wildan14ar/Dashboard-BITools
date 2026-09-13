import { NextResponse } from 'next/server';
import { settings } from '@/config/settings';

export class ResponseHandler {
    private static create(
        success: boolean,
        message: string,
        data: unknown = null,
        status: number
    ) {
        return NextResponse.json(
            {
                success,
                message,
                data,
            },
            { status }
        );
    }

    static success(message: string, data: unknown = null) {
        return this.create(true, message, data, 200);
    }

    static created(message: string, data: unknown = null) {
        return this.create(true, message, data, 201);
    }

    static noContent() {
        return new NextResponse(null, { status: 204 });
    }

    static badRequest(message = 'Bad Request', errorData: unknown = null) {
        return this.create(false, message, errorData, 400);
    }

    static unauthorized(message = 'Unauthorized') {
        return this.create(false, message, null, 401);
    }

    static forbidden(message = 'Forbidden') {
        return this.create(false, message, null, 403);
    }

    static notFound(message = 'Resource not found') {
        return this.create(false, message, null, 404);
    }

    static conflict(message = 'Conflict', conflictData: unknown = null) {
        return this.create(false, message, conflictData, 409);
    }

    static unprocessableEntity(message = 'Unprocessable Entity', errorData: unknown = null) {
        return this.create(false, message, errorData, 422);
    }

    static tooManyRequests(message = 'Too Many Requests') {
        return this.create(false, message, null, 429);
    }

    static internalError(message = 'Internal Server Error', errorStack: unknown = null) {
        const isDev = settings.NODE_ENV !== 'production';
        const errorData = isDev ? errorStack : null;

        return this.create(false, message, errorData, 500);
    }
}

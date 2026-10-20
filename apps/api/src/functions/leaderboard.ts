import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { MemoryLeaderboardStore } from '../leaderboard/memory-store';
import { LeaderboardService } from '../leaderboard/service';
import { ApiError } from '../leaderboard/types';

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

export function createLeaderboardHandlers(service: LeaderboardService): {
  get(request: HttpRequest): Promise<HttpResponseInit>;
  post(request: HttpRequest): Promise<HttpResponseInit>;
} {
  const get = async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const page = await service.list(request.query);
      return { status: 200, headers: jsonHeaders, jsonBody: page };
    } catch (error) {
      return errorResponse(error);
    }
  };

  const post = async (request: HttpRequest): Promise<HttpResponseInit> => {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return {
        status: 400,
        headers: jsonHeaders,
        jsonBody: { error: { code: 'INVALID_JSON', message: 'JSON 요청 본문을 확인해 주세요.' } },
      };
    }
    try {
      const entry = await service.submit(input);
      return { status: 200, headers: jsonHeaders, jsonBody: { entry } };
    } catch (error) {
      return errorResponse(error);
    }
  };
  return { get, post };
}

function errorResponse(error: unknown): HttpResponseInit {
  if (error instanceof ApiError) {
    const headers = error.retryAfterSeconds === undefined
      ? jsonHeaders
      : { ...jsonHeaders, 'Retry-After': String(error.retryAfterSeconds) };
    return {
      status: error.status,
      headers,
      jsonBody: { error: { code: error.code, message: error.message } },
    };
  }
  return {
    status: 500,
    headers: jsonHeaders,
    jsonBody: { error: { code: 'INTERNAL_ERROR', message: '요청을 처리하지 못했습니다.' } },
  };
}

const configuredStore = process.env.LEADERBOARD_STORE?.toLowerCase();
if (configuredStore === 'sql') {
  throw new Error('SQL leaderboard storage is not initialized. Complete P02-T02 before setting LEADERBOARD_STORE=sql.');
}

const handlers = createLeaderboardHandlers(new LeaderboardService(new MemoryLeaderboardStore()));

app.http('leaderboard-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: handlers.get,
});

app.http('leaderboard-submit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: handlers.post,
});

import { slackAxios } from "./client";
import { UserInfo } from "./types";

type RawUser = {
  id: string;
  name: string;
  real_name: string;
  profile: {
    real_name: string;
    image_original: string;
    image_32: string;
  };
};

type GetUsersResponse = {
  ok: boolean;
  members: RawUser[];
  response_metadata: { next_cursor?: string };
};

export async function getUsers(cursor?: string): Promise<RawUser[]> {
  console.log("getUsers", cursor || "start");
  const response = await slackAxios.get<GetUsersResponse>("/users.list", {
    params: { limit: 1000, cursor },
  });

  if (response.data.response_metadata.next_cursor) {
    return [...response.data.members, ...(await getUsers(response.data.response_metadata.next_cursor))];
  }
  return response.data.members;
}

export async function getCurrentUser(): Promise<{ id: string; name: string; team_id: string }> {
  const response = await slackAxios.get<{ ok: boolean; user_id: string; user: string; team_id: string }>("/auth.test");
  return { id: response.data.user_id, name: response.data.user, team_id: response.data.team_id };
}

export function buildUserDirectory(users: RawUser[]): Record<string, UserInfo> {
  const dir: Record<string, UserInfo> = {};
  for (const user of users) {
    dir[user.id] = {
      id: user.id,
      nickname: user.name,
      name: user.real_name || user.profile.real_name,
      image: user.profile.image_32,
    };
  }
  return dir;
}

type GetUserInfoResponse = {
  ok: boolean;
  error?: string;
  user?: RawUser;
};

export async function getUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    const response = await slackAxios.get<GetUserInfoResponse>("/users.info", { params: { user: userId } });
    if (!response.data.ok || !response.data.user) return null;
    const u = response.data.user;
    return {
      id: u.id,
      nickname: u.name,
      name: u.real_name || u.profile.real_name,
      image: u.profile.image_32,
    };
  } catch (error) {
    console.error(`[users.info] Error fetching ${userId}:`, error);
    return null;
  }
}

export type { RawUser };

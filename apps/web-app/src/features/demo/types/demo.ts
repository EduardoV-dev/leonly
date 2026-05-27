export interface DemoPost {
  id: number;
  title: string;
  body: string;
  userId: number;
}

export interface CreateDemoPostPayload {
  title: string;
  body: string;
  userId: number;
}

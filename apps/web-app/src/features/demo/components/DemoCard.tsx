import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showErrorToast } from '@/components/ui/error-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateDemoMutation } from '@/features/demo/hooks/use-create-demo-mutation';
import { useDemoQuery } from '@/features/demo/hooks/use-demo-query';
import { type FormEvent, useEffect, useState } from 'react';

export function DemoCard() {
  const [title, setTitle] = useState('Shadcn baseline ready');
  const [body, setBody] = useState('Feature-based architecture live.');

  const demoQuery = useDemoQuery();
  const createDemoMutation = useCreateDemoMutation();

  useEffect(() => {
    if (demoQuery.isError) {
      showErrorToast('Failed to fetch demo post.', 'Check API base URL or network connectivity.');
    }
  }, [demoQuery.isError]);

  useEffect(() => {
    if (createDemoMutation.isError) {
      showErrorToast('Failed to create demo post.', 'Request rejected or network unavailable.');
    }
  }, [createDemoMutation.isError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await createDemoMutation.mutateAsync({
      userId: 1,
      title,
      body,
    });
  };

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-xl">
      <CardHeader>
        <CardTitle>Demo feature module</CardTitle>
        <CardDescription>
          Uses Axios for API calls and TanStack Query for GET and POST.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-800">GET /posts/1</p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => demoQuery.refetch()}
              disabled={demoQuery.isFetching}
              variant="secondary"
            >
              {demoQuery.isFetching ? 'Loading...' : 'Fetch demo post'}
            </Button>
          </div>
          {demoQuery.isFetching ? (
            <div className="space-y-2 rounded-md bg-slate-50 p-3">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : null}
          {demoQuery.data ? (
            <article className="rounded-md bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{demoQuery.data.title}</p>
              <p className="mt-1 text-slate-700">{demoQuery.data.body}</p>
            </article>
          ) : null}
        </div>

        <form className="space-y-3 rounded-lg border border-slate-200 p-4" onSubmit={handleSubmit}>
          <p className="text-sm font-medium text-slate-800">POST /posts</p>

          <div className="space-y-2">
            <Label htmlFor="demo-title">Title</Label>
            <Input
              id="demo-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Post title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-body">Body</Label>
            <Input
              id="demo-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Post body"
              required
            />
          </div>

          <Button type="submit" disabled={createDemoMutation.isPending}>
            {createDemoMutation.isPending ? 'Posting...' : 'Create demo post'}
          </Button>

          {createDemoMutation.data ? (
            <p className="text-sm text-emerald-700">
              Created post id: {createDemoMutation.data.id} (response from demo API)
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

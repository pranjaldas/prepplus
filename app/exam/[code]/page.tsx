import { redirect } from 'next/navigation';

export default function ExamIndexPage({ params }: { params: { code: string } }) {
  redirect(`/exam/${params.code}/instructions`);
}

import { auth } from '@/auth'
import SignupForm from '@/components/signup-form'
import { Session } from '@/lib/types'
import { redirect } from 'next/navigation'

export default async function SignupPage() {
  const session = (await auth()) as Session

  if (process.env.SIGNUP_ALLOWED !== 'true') {
    return (
      <main className="flex flex-col p-4">
        <div className="w-full flex-1 px-6 pb-4 pt-8">
          <h1 className="mb-3 text-2xl font-bold">Signup not allowed!</h1>
        </div>  
      </main>
    )
  }

  if (session) {
    redirect('/')
  }

  return (
    <main className="flex flex-col p-4">
      <SignupForm />
    </main>
  )
}

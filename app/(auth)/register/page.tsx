'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { AccessDeniedDialog } from '@/components/access-denied-dialog';
import { MarketingInfo } from '@/components/marketing-info';
import { AuthBackground } from '@/components/ui/auth-background';

import { register, type RegisterActionState } from '../actions';
import { toast } from '@/components/toast';
import { useSession } from 'next-auth/react';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast({ type: 'error', description: 'Account already exists!' });
    } else if (state.status === 'failed') {
      toast({ type: 'error', description: 'Failed to create account!' });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Invalid data. Please check that passwords match and are at least 6 characters.',
      });
    } else if (state.status === 'access_denied') {
      setShowAccessDeniedDialog(true);
    } else if (state.status === 'success') {
      toast({ type: 'success', description: 'Account created successfully!' });

      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
  }, [state]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <AuthBackground>
      <div className="overflow-hidden rounded-2xl gap-4 md:gap-8 lg:gap-16 flex flex-col">
        <MarketingInfo />
        <div className="w-full max-w-md overflow-hidden mx-auto mt-8">
          <motion.div 
            className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16"
            initial={{ 
              opacity: 0, 
              y: 15
            }}
            animate={{ 
              opacity: 1, 
              y: 0
            }}
            transition={{
              duration: 0.4,
              delay: 1.3,
              ease: "easeOut"
            }}
          >
            <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Create an account with your email and password
            </p>
          </motion.div>
          <AuthForm action={handleSubmit} defaultEmail={email} mode="register" >

            <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {'Already have an account? '}
              <Link
                href="/login"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign in
              </Link>
              {' instead.'}
            </p>
          </AuthForm>
        </div>
        <AccessDeniedDialog
          open={showAccessDeniedDialog}
          onOpenChange={setShowAccessDeniedDialog}
        />
      </div>
    </AuthBackground>
  );
}

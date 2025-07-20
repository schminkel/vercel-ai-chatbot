'use client';

import { NavigationLink } from '@/components/navigation-link';
import { useNavigationWithLoading } from '@/hooks/use-navigation-with-loading';
import { useActionState, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { AccessDeniedDialog } from '@/components/access-denied-dialog';
import { MarketingInfo } from '@/components/marketing-info';
import { AuthBackground } from '@/components/ui/auth-background';

import { login, type LoginActionState } from '../actions';
import { useSession } from 'next-auth/react';

export default function Page() {
  const { push } = useNavigationWithLoading();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'failed') {
      toast({
        type: 'error',
        description: 'Invalid credentials!',
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
    } else if (state.status === 'access_denied') {
      setShowAccessDeniedDialog(true);
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      push('/');
    }
  }, [state.status, push, updateSession]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <AuthBackground>
      <div className="overflow-hidden rounded-2xl flex flex-col gap-2 md:gap-8 lg:gap-16">
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
            <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Use your email and password to sign in
            </p>
          </motion.div>
          <AuthForm action={handleSubmit} defaultEmail={email}>
            <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {"Don't have an account? "}
              <NavigationLink
                href="/register"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign up
              </NavigationLink>
              {' for free.'}
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

'use client';

import Form from 'next/form';
import { useState } from 'react';
import { motion } from 'framer-motion';

import { Input } from './ui/input';
import { Label } from './ui/label';

export function AuthForm({
  action,
  children,
  defaultEmail = '',
  mode = 'login',
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  mode?: 'login' | 'register';
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (mode === 'register' && confirmPassword && value !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (mode === 'register' && password && value !== password) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = (formData: FormData) => {
    if (mode === 'register' && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (typeof action === 'function') {
      action(formData);
    }
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 20,
        scale: 0.95
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: 1
      }}
      transition={{
        duration: 0.5,
        delay: 1.5,
        ease: "easeOut"
      }}
    >
      <Form action={handleSubmit} className="flex flex-col gap-4 px-8 sm:px-16 pt-8">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="email"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Email Address
          </Label>

          <Input
            id="email"
            name="email"
            className="bg-muted text-md md:text-sm"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            required
            autoFocus
            defaultValue={defaultEmail}
            data-testid="email-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="password"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Password
          </Label>

          <Input
            id="password"
            name="password"
            className="bg-muted text-md md:text-sm"
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            minLength={6}
            required
            data-testid="password-input"
          />
        </div>

        {mode === 'register' && (
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="confirmPassword"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              Confirm Password
            </Label>

            <Input
              id="confirmPassword"
              name="confirmPassword"
              className="bg-muted text-md md:text-sm"
              type="password"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              minLength={6}
              required
              data-testid="password-input-confirm"
            />
            {passwordError && (
              <p className="text-sm text-red-500 dark:text-red-400">
                {passwordError}
              </p>
            )}
          </div>
        )}

        <div className='pb-2' />

        {children}
      </Form>
    </motion.div>
  );
}

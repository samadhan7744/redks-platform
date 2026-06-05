'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ShieldCheck, ShoppingBag } from 'lucide-react';
import { api, getErrorMessage, unwrap } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type VerifyResponse = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    phone: string;
    name?: string | null;
    email?: string | null;
    roles: string[];
    status: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!resendIn) return;
    const timer = window.setInterval(
      () => setResendIn((value) => Math.max(value - 1, 0)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    setOnline(window.navigator.onLine);
    const update = () => setOnline(window.navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/request-otp', { phone });
      setDevOtp(response.data.devOtp ?? null);
      setResendIn(30);
      setStep('otp');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = unwrap<VerifyResponse>(
        await api.post('/auth/verify-otp', { phone, otp }),
      );
      const allowed = session.user.roles.some((role) =>
        ['ADMIN', 'SUPER_ADMIN'].includes(role),
      );
      if (!allowed) {
        setError(
          'This phone number is not assigned an Admin or Super Admin role.',
        );
        return;
      }
      setSession(session);
      router.replace('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
        <section className="flex flex-col justify-between p-8 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-red-950/30">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold">RedKS</div>
              <div className="text-sm text-slate-300">
                Har Dukaan, Ghar Tak.
              </div>
            </div>
          </div>
          <div className="max-w-2xl py-12">
            <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
              Control room for local commerce.
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300">
              Manage approvals, city operations, orders, riders, products, and
              customer requests from one focused admin surface.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            <span className={online ? 'h-2 w-2 rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-red-400'} />
            {online ? 'Connected' : 'Offline'}
          </div>
        </section>
        <section className="flex items-center bg-[#F8F9FA] p-6 text-slate-950 lg:p-10">
          <Card className="w-full border-slate-200 shadow-xl shadow-slate-900/10">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle>Admin login</CardTitle>
              <p className="text-sm text-muted-foreground">
                Use the OTP flow configured in the RedKS backend.
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={step === 'phone' ? requestOtp : verifyOtp}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Phone number
                  </label>
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="9999999999"
                  />
                </div>
                {step === 'otp' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      OTP
                    </label>
                    <Input
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      placeholder="123456"
                    />
                    {devOtp ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Development OTP: {devOtp}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
                <Button
                  className="w-full"
                  disabled={loading || !phone || (step === 'otp' && !otp)}
                >
                  {loading
                    ? 'Please wait'
                    : step === 'phone'
                      ? 'Request OTP'
                      : 'Verify OTP'}
                </Button>
                {step === 'otp' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep('phone')}
                  >
                    Change phone number
                  </Button>
                ) : null}
                {step === 'otp' ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading || resendIn > 0}
                    onClick={(event) => requestOtp(event)}
                  >
                    {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

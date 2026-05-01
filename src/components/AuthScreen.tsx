import { useState } from "react";
import { api } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import logo from "@/assets/snowwolf-logo.png";
import Snowfall from "./Snowfall";
import { lovable } from "@/integrations/lovable/index";

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") await api.signup(email, password, username);
      else await api.login(email, password);
      onAuth();
    } catch (err: any) {
      toast.error(err.message || "حصل خطأ");
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("فشل الدخول بـ Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      onAuth();
    } catch (err: any) {
      toast.error(err.message || "فشل الدخول بـ Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-gradient-night">
      <Snowfall count={50} />
      <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-primary/30 blur-[120px]" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-accent/30 blur-[120px]" />

      <div className="relative w-full max-w-md animate-float-in z-10">
        <div className="text-center mb-8">
          <div className="inline-block mb-4 drop-shadow-[0_0_30px_rgba(56,189,248,0.6)]">
            <img src={logo} alt="SnowWolf" className="w-32 h-32 object-contain mx-auto" />
          </div>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            بيتك الجديد للدردشة والصوت
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-deep">
          <div className="flex gap-2 mb-6 p-1 bg-secondary rounded-xl">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "signup" ? "bg-gradient-ice text-primary-foreground shadow-ice" : "text-muted-foreground"
              }`}
            >
              حساب جديد
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "login" ? "bg-gradient-ice text-primary-foreground shadow-ice" : "text-muted-foreground"
              }`}
            >
              تسجيل دخول
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">الإيميل</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 bg-secondary border-border"
                required
                dir="ltr"
              />
            </div>
            {mode === "signup" && (
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">اسم المستخدم</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثلاً: alpha_wolf"
                  className="h-12 bg-secondary border-border"
                  maxLength={24}
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">كلمة السر</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 حروف على الأقل"
                className="h-12 bg-secondary border-border"
                minLength={6}
                required
                dir="ltr"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-ice text-primary-foreground hover:opacity-90 shadow-ice text-base font-bold"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "signup" ? "انضم للقطيع" : "ادخل"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">أو</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            type="button"
            onClick={googleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full h-12 gap-3 bg-secondary/50 border-border hover:bg-secondary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-semibold">دخول بـ Google</span>
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-6">🔒 الحساب محفوظ في السحابة — تقدر تدخل من أي جهاز</p>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          جميع الحقوق محفوظة © {new Date().getFullYear()} <span className="text-primary font-bold">Clan SnowWolf</span>
        </p>
      </div>
    </div>
  );
}

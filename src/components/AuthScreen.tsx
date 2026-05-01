import { useState } from "react";
import { api } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import logo from "@/assets/snowwolf-logo.png";
import Snowfall from "./Snowfall";

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "signup") api.signup(username, password);
      else api.login(username, password);
      onAuth();
    } catch (err: any) {
      toast.error(err.message || "حصل خطأ");
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
              <label className="text-xs font-bold text-muted-foreground mb-2 block">اسم المستخدم</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً: alpha_wolf"
                className="h-12 bg-secondary border-border"
                maxLength={24}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block">كلمة السر</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="h-12 bg-secondary border-border"
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-gradient-ice text-primary-foreground hover:opacity-90 shadow-ice text-base font-bold">
              {mode === "signup" ? "انضم للقطيع" : "ادخل"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">🔒 البيانات بتتخزن محلياً في المتصفح</p>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          جميع الحقوق محفوظة © {new Date().getFullYear()} <span className="text-primary font-bold">Clan SnowWolf</span>
        </p>
      </div>
    </div>
  );
}

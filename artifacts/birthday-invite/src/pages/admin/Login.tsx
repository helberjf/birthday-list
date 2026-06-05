import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Loader2 } from "lucide-react";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  password: z.string().min(1, "A senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const { login } = useAuth();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" }
  });

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
      }
    }
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 border border-border/50">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-4xl font-display text-center text-foreground mb-2">Área Restrita</h1>
        <p className="text-center text-muted-foreground mb-8">Digite a senha para gerenciar os convidados.</p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-bold">Senha de Acesso</Label>
            <Input 
              type="password"
              {...form.register("password")} 
              className="h-14 rounded-xl text-lg text-center tracking-widest bg-muted/30 focus:bg-white"
              placeholder="••••••••"
            />
            {form.formState.errors.password && (
              <p className="text-destructive text-sm font-medium">{form.formState.errors.password.message}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loginMutation.isPending}
            className="w-full bg-primary text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
          </button>

          {loginMutation.isError && (
            <p className="text-center text-destructive text-sm font-medium bg-destructive/10 p-3 rounded-lg">
              {(loginMutation.error as any)?.error || "Senha incorreta."}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

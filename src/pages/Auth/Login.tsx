import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "./Auth.module.css";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAuth();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch {
      /* error shown via context */
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.logo}>Nexwear</p>
        <h1 className={styles.title}>Iniciar Sesión</h1>
        <p className={styles.sub}>Bienvenido de vuelta</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@ejemplo.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <div className={styles.forgot}>
            <Link to="/auth/recuperar">¿Olvidaste tu contraseña?</Link>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <Button
            type="submit"
            variant="fill"
            size="lg"
            fullWidth
            loading={loading}
          >
            Iniciar Sesión
          </Button>
        </form>

        <p className={styles.switch}>
          ¿No tienes cuenta? <Link to="/auth/registro">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

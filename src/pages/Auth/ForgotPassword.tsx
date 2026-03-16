import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import authService from "@/services/authService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "./Auth.module.css";

const ForgotPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Request reset ──────────────────────────────────────────────────────────
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setSuccess("¡Correo enviado! Revisa tu bandeja de entrada.");
    } catch {
      setError("No encontramos ese correo electrónico.");
    } finally {
      setLoading(false);
    }
  };

  // ── Set new password ───────────────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token!, password);
      setSuccess("¡Contraseña actualizada! Ya puedes iniciar sesión.");
    } catch {
      setError("El enlace expiró o es inválido. Solicita uno nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          Nexwear
        </Link>
        <h1 className={styles.title}>
          {token ? "Nueva Contraseña" : "Recuperar Contraseña"}
        </h1>
        <p className={styles.sub}>
          {token
            ? "Escribe tu nueva contraseña"
            : "Te enviaremos un enlace de recuperación"}
        </p>

        {success ? (
          <div className={styles.successBox}>
            <p>{success}</p>
            <Link to="/auth/login" className={styles.backLink}>
              ← Iniciar sesión
            </Link>
          </div>
        ) : token ? (
          <form className={styles.form} onSubmit={handleReset}>
            <Input
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              hint="Mínimo 8 caracteres"
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
            {error && <p className={styles.errorMsg}>{error}</p>}
            <Button
              type="submit"
              variant="fill"
              size="lg"
              fullWidth
              loading={loading}
            >
              Actualizar Contraseña
            </Button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleRequest}>
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@ejemplo.com"
              required
            />
            {error && <p className={styles.errorMsg}>{error}</p>}
            <Button
              type="submit"
              variant="fill"
              size="lg"
              fullWidth
              loading={loading}
            >
              Enviar Enlace
            </Button>
          </form>
        )}

        <p className={styles.switch}>
          <Link to="/auth/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
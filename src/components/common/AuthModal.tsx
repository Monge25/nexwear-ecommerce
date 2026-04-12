import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import authService from "@/services/authService";
import styles from "./AuthModal.module.css";

type View = "login" | "register" | "forgot" | "verify-code" | "reset-password";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
  onSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  reason,
  onSuccess,
}) => {
  const { login, register } = useAuth();

  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login / Register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [confirm, setConfirm] = useState("");

  // Forgot / Reset
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");

  const reset = () => {
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await login({ email, password });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
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
      await register({
        firstName,
        lastName,
        email,
        password,
        confirmPassword: confirm,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  // Paso 1 — enviar código al correo
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setView("verify-code");
    } catch {
      setError("No encontramos ese correo.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 2 — verificar código
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await authService.verifyResetCode(email, resetCode);
      setView("reset-password");
    } catch {
      setError("Código incorrecto o expirado.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 3 — nueva contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (newPassword !== confirmNew) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email, resetCode, newPassword);
      setSuccess("✓ Contraseña actualizada. Ya puedes iniciar sesión.");
      setTimeout(() => {
        setView("login");
        setSuccess("");
        setResetCode("");
        setNewPassword("");
        setConfirmNew("");
      }, 2000);
    } catch {
      setError("Error al actualizar la contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setView("login");
    reset();
    setResetCode("");
    setNewPassword("");
    setConfirmNew("");
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>
          ✕
        </button>

        <p className={styles.logo}>Nexwear</p>
        {reason && <p className={styles.reason}>{reason}</p>}

        {/* Tabs — solo en login/register */}
        {(view === "login" || view === "register") && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${view === "login" ? styles.tabOn : ""}`}
              onClick={() => {
                setView("login");
                reset();
              }}
            >
              Iniciar Sesión
            </button>
            <button
              className={`${styles.tab} ${view === "register" ? styles.tabOn : ""}`}
              onClick={() => {
                setView("register");
                reset();
              }}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* ── LOGIN ── */}
        {view === "login" && (
          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.field}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@ejemplo.com"
                required
              />
            </div>
            <div className={styles.field}>
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => {
                setView("forgot");
                reset();
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
            {error && <p className={styles.err}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : null}
              Iniciar Sesión
            </button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {view === "register" && (
          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label>Nombre</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="Ana"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Apellido</label>
                <input
                  value={lastName}
                  onChange={(e) => setLast(e.target.value)}
                  placeholder="García"
                  required
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@ejemplo.com"
                required
              />
            </div>
            <div className={styles.field}>
              <label>
                Contraseña <span>(mín. 8 caracteres)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className={styles.field}>
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className={styles.err}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : null}
              Crear Cuenta Gratis
            </button>
            <p className={styles.terms}>
              Al registrarte aceptas nuestros <a href="#">Términos</a> y{" "}
              <a href="#">Privacidad</a>.
            </p>
          </form>
        )}

        {/* ── FORGOT — Paso 1: ingresar correo ── */}
        {view === "forgot" && (
          <form className={styles.form} onSubmit={handleForgot}>
            <p className={styles.forgotTitle}>Recuperar contraseña</p>
            <p className={styles.forgotSub}>
              Ingresa tu correo y te enviaremos un código de verificación.
            </p>
            <div className={styles.field}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@ejemplo.com"
                required
              />
            </div>
            {error && <p className={styles.err}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : null}
              Enviar código
            </button>
            <button
              type="button"
              className={styles.backLink}
              onClick={goToLogin}
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        )}

        {/* ── VERIFY CODE — Paso 2: ingresar código ── */}
        {view === "verify-code" && (
          <form className={styles.form} onSubmit={handleVerifyCode}>
            <p className={styles.forgotTitle}>Verifica tu código</p>
            <p className={styles.forgotSub}>
              Enviamos un código a <strong>{email}</strong>. Revisa tu bandeja
              de entrada.
            </p>
            <div className={styles.field}>
              <label>Código de verificación</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.trim())}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                style={{
                  letterSpacing: "0.3em",
                  fontSize: 20,
                  textAlign: "center",
                }}
              />
            </div>
            {error && <p className={styles.err}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : null}
              Verificar código
            </button>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => {
                setView("forgot");
                reset();
              }}
            >
              ← Reenviar código
            </button>
          </form>
        )}

        {/* ── RESET PASSWORD — Paso 3: nueva contraseña ── */}
        {view === "reset-password" && (
          <form className={styles.form} onSubmit={handleResetPassword}>
            <p className={styles.forgotTitle}>Nueva contraseña</p>
            <p className={styles.forgotSub}>
              Elige una contraseña segura de al menos 8 caracteres.
            </p>
            {success ? (
              <div className={styles.successBox}>{success}</div>
            ) : (
              <>
                <div className={styles.field}>
                  <label>Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmNew}
                    onChange={(e) => setConfirmNew(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {error && <p className={styles.err}>{error}</p>}
                <button
                  type="submit"
                  className={styles.submit}
                  disabled={loading}
                >
                  {loading ? <span className={styles.spinner} /> : null}
                  Guardar nueva contraseña
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

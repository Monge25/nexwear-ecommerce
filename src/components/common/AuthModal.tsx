import React, { useState, useEffect } from "react";
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

const EyeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
             a18.45 18.45 0 0 1 5.06-5.94"
    />
    <path
      d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8
             a18.5 18.5 0 0 1-2.16 3.19"
    />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const validatePassword = (pwd: string): string | null => {
  if (pwd.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(pwd)) return "Debe contener al menos una letra mayúscula.";
  if (!/[a-z]/.test(pwd)) return "Debe contener al menos una letra minúscula.";
  if (!/[0-9]/.test(pwd)) return "Debe contener al menos un número.";
  if (!/[^A-Za-z0-9]/.test(pwd))
    return "Debe contener al menos un carácter especial.";
  return null;
};

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

  // Show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);

  useEffect(() => {
    setView("login");
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setFirst("");
    setLast("");
    setConfirm("");
    setResetCode("");
    setNewPassword("");
    setConfirmNew("");
    setShowPassword(false);
    setShowConfirm(false);
    setShowNew(false);
    setShowConfirmNew(false);
  }, [open]);

  const reset = () => {
    setError("");
    setSuccess("");
  };

  const handleClose = () => onClose();

  // ── LOGIN ────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await login({ email, password });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const serverMessage = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      if (status === 401 || status === 404) {
        setError("Correo o contraseña incorrectos. Verifica tus datos.");
      } else if (serverMessage) {
        setError(serverMessage);
      } else {
        setError("Ocurrió un error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (firstName.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (lastName.trim().length < 2) {
      setError("El apellido debe tener al menos 2 caracteres.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword: confirm,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const serverMessage = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      if (status === 409) {
        setError("Este correo ya está registrado. Intenta iniciar sesión.");
      } else if (status === 400) {
        setError(serverMessage ?? "Datos inválidos. Revisa el formulario.");
      } else if (serverMessage) {
        setError(serverMessage);
      } else {
        setError("Ocurrió un error al crear la cuenta. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT ───────────────────────────────────────────────────────
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

  // ── VERIFY CODE ──────────────────────────────────────────────────
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

  // ── RESET PASSWORD ───────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (newPassword !== confirmNew) {
      setError("Las contraseñas no coinciden.");
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
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={handleClose}>
          ✕
        </button>

        <p className={styles.logo}>Nexwear</p>
        {reason && <p className={styles.reason}>{reason}</p>}

        {/* Tabs */}
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
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
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
                Contraseña{" "}
                <span>
                  (mín. 8 car., mayúscula, minúscula, número y símbolo)
                </span>
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label>Confirmar contraseña</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showConfirm ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
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

        {/* ── FORGOT ── */}
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

        {/* ── VERIFY CODE ── */}
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
            <button
              type="button"
              className={styles.backLink}
              onClick={goToLogin}
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        )}

        {/* ── RESET PASSWORD ── */}
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
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowNew((v) => !v)}
                      tabIndex={-1}
                      aria-label={
                        showNew ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showNew ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Confirmar contraseña</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showConfirmNew ? "text" : "password"}
                      value={confirmNew}
                      onChange={(e) => setConfirmNew(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowConfirmNew((v) => !v)}
                      tabIndex={-1}
                      aria-label={
                        showConfirmNew
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showConfirmNew ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>
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

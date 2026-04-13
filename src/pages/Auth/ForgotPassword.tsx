import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import authService from "@/services/authService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "./Auth.module.css";

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [password, setPass]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Paso 1 — Solicitar código
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setStep('code');
      setSuccess('Código enviado. Revisa tu bandeja de entrada.');
    } catch {
      setError('No encontramos ese correo electrónico.');
    } finally { setLoading(false); }
  };

  // Paso 2 — Verificar código
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authService.verifyResetCode(email, code);
      setStep('password');
      setSuccess('');
    } catch {
      setError('Código inválido o expirado.');
    } finally { setLoading(false); }
  };

  // Paso 3 — Nueva contraseña
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8)  { setError('Mínimo 8 caracteres'); return; }
    setLoading(true);
    try {
      await authService.resetPassword(email, code, password);
      setSuccess('¡Contraseña actualizada! Ya puedes iniciar sesión.');
    } catch {
      setError('El código expiró o es inválido. Solicita uno nuevo.');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>Nexwear</Link>
        <h1 className={styles.title}>Recuperar Contraseña</h1>

        {success && step === 'password' ? (
          <div className={styles.successBox}>
            <p>{success}</p>
            <Link to="/auth/login" className={styles.backLink}>← Iniciar sesión</Link>
          </div>
        ) : step === 'email' ? (
          <form className={styles.form} onSubmit={handleRequest}>
            <p className={styles.sub}>Te enviaremos un código de recuperación</p>
            <Input label="Correo electrónico" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@ejemplo.com" required />
            {error && <p className={styles.errorMsg}>{error}</p>}
            <Button type="submit" variant="fill" size="lg" fullWidth loading={loading}>
              Enviar Código
            </Button>
          </form>
        ) : step === 'code' ? (
          <form className={styles.form} onSubmit={handleVerify}>
            <p className={styles.sub}>{success}</p>
            <p className={styles.sub}>Ingresa el código de 6 dígitos que enviamos a {email}</p>
            <Input label="Código de verificación" type="text" value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456" maxLength={6} required />
            {error && <p className={styles.errorMsg}>{error}</p>}
            <Button type="submit" variant="fill" size="lg" fullWidth loading={loading}>
              Verificar Código
            </Button>
            <button type="button" className={styles.backLink}
              onClick={() => { setStep('email'); setError(''); }}>
              ← Cambiar correo
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleReset}>
            <p className={styles.sub}>Escribe tu nueva contraseña</p>
            <Input label="Nueva contraseña" type="password" value={password}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Mínimo 8 caracteres" required />
            <Input label="Confirmar contraseña" type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••" required />
            {error && <p className={styles.errorMsg}>{error}</p>}
            <Button type="submit" variant="fill" size="lg" fullWidth loading={loading}>
              Actualizar Contraseña
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
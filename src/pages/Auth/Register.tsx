import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "./Auth.module.css";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [validationError, setValidationError] = useState("");

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");
    if (form.password !== form.confirmPassword) {
      setValidationError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 8) {
      setValidationError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    try {
      await register(form);
      navigate("/");
    } catch {
      /* error shown via context */
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.logo}>Nexwear</p>
        <h1 className={styles.title}>Crear Cuenta</h1>
        <p className={styles.sub}>Únete a la comunidad Nexwear</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid2}>
            <Input
              label="Nombre"
              value={form.firstName}
              onChange={set("firstName")}
              placeholder="Ana"
              required
            />
            <Input
              label="Apellido"
              value={form.lastName}
              onChange={set("lastName")}
              placeholder="García"
              required
            />
          </div>
          <Input
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="ana@ejemplo.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder="Mínimo 8 caracteres"
            required
            hint="Al menos 8 caracteres"
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            placeholder="••••••••"
            required
          />
          {(error || validationError) && (
            <p className={styles.error}>{validationError || error}</p>
          )}
          <Button
            type="submit"
            variant="fill"
            size="lg"
            fullWidth
            loading={loading}
          >
            Crear Cuenta
          </Button>
        </form>

        <p className={styles.switch}>
          ¿Ya tienes cuenta? <Link to="/auth/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

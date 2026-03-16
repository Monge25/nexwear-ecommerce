import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import styles from "./NotFound.module.css";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Página no encontrada</h1>
      <p className={styles.desc}>
        La página que buscas no existe o fue movida.
      </p>
      <Button onClick={() => navigate("/")}>Volver al Inicio</Button>
    </div>
  );
};

export default NotFound;

import React, { useEffect, useState, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import { UserCog, UserCircle, Euro, Briefcase, ShieldCheck, Phone as PhoneIcon, Edit3, Save, XCircle, Loader2, KeyRound } from "lucide-react";

// --- Estilos e Animações ---
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  padding: '2rem',
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 15 } }
};

// --- Sub-componentes para um código mais limpo ---

const ProfileHeader = ({ username }) => (
  <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <UserCog size={36} style={{ color: 'rgb(147, 51, 234)' }} />
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Gestão de Perfil
        </h1>
        <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>
          {username ? `Bem-vindo(a), ${username}` : "Veja e atualize os seus dados"}
        </p>
      </div>
    </div>
  </motion.div>
);

const ProfileField = ({ label, value, icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <div style={{ color: 'rgb(147, 51, 234)' }}>{icon}</div>
    <div>
      <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{label}</h3>
      <p style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{value}</p>
    </div>
  </div>
);

const ProfileView = ({ profile, onEditClick }) => (
  <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <UserCircle size={32} style={{ color: 'rgb(59, 130, 246)' }} />
      <div>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: 'white' }}>Nome de Utilizador</h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>{profile.username || "Não disponível"}</p>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <ProfileField label="Taxa Horária" value={`${parseFloat(profile.hourly_rate || 0).toFixed(2)} €/hora`} icon={<Euro size={20} />} />
      <ProfileField label="Função" value={profile.role || "Não especificado"} icon={<Briefcase size={20} />} />
      <ProfileField label="Nível de Acesso" value={profile.access_level || "Não especificado"} icon={<KeyRound size={20} />} />
      <ProfileField label="Telefone" value={profile.phone || "Não especificado"} icon={<PhoneIcon size={20} />} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <motion.button onClick={onEditClick} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        style={{ padding: '0.75rem 1.5rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <Edit3 size={18} /> Editar Perfil
      </motion.button>
    </div>
  </motion.div>
);

const ProfileEditForm = ({ initialData, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState(initialData);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const fields = [
    { name: "hourly_rate", label: "Taxa Horária (€)", type: "number", step: "0.01", min: "0", icon: <Euro size={18}/> },
    { name: "role", label: "Função", type: "text", placeholder: "Ex: Developer, Manager", icon: <Briefcase size={18}/> },
    { name: "phone", label: "Telefone", type: "tel", placeholder: "Ex: +351912345678", icon: <PhoneIcon size={18}/> },
    { name: "access_level", label: "Nível de Acesso", type: "text", placeholder: "Ex: Standard, Admin", icon: <KeyRound size={18}/> },
  ];

  return (
    <motion.form key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit}>
      {fields.map(field => (
        <div key={field.name} style={{ marginBottom: '1.5rem' }}>
          <label htmlFor={field.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
            {field.icon} {field.label}
          </label>
          <input
            type={field.type} id={field.name} name={field.name} value={formData[field.name]}
            onChange={handleInputChange} step={field.step} min={field.min} placeholder={field.placeholder}
            style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}
            required={field.name === "role"}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <motion.button type="button" onClick={onCancel} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{ padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          disabled={isLoading}>
          <XCircle size={18} /> Cancelar
        </motion.button>
        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{ padding: '0.75rem 1.5rem', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Guardar Alterações
        </motion.button>
      </div>
    </motion.form>
  );
};

// --- Componente Principal ---
const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/profiles/');
      if (response.data && response.data.length > 0) {
        setProfile(response.data[0]);
      } else {
        // Se não há perfil, não faz nada, pois o handleSubmit cuidará da criação.
        console.log("Nenhum perfil encontrado. O formulário irá criar um novo.");
      }
    } catch (error) {
      toast.error("Falha ao carregar o perfil.");
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (formData) => {
    setIsLoading(true);
    try {
      // Prepara os dados, garantindo que o hourly_rate é um número
      const submissionData = {
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate) || 0.00,
      };

      // **CORREÇÃO PRINCIPAL:** O endpoint para PUT/PATCH é geralmente /profiles/{id}/
      // O ID do perfil está associado ao ID do user. No seu backend, o ID do perfil é a chave primária do user.
      const profileId = profile.user; // O ID do perfil é o mesmo ID do usuário

      await api.put(`/profiles/${profileId}/`, submissionData);
      
      toast.success("Perfil atualizado com sucesso.");
      setIsEditing(false);
      await fetchProfile(); // Re-sincroniza com os dados do servidor
    } catch (error) {
      console.error("Erro ao submeter perfil:", error);
      toast.error(`Falha ao atualizar: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading && !profile) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} />
        </div>
      );
    }

    if (!profile && !isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <ShieldCheck size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem' }}>Perfil Não Encontrado</h2>
          <p>Não foi possível carregar os dados. Tente atualizar a página.</p>
        </div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        {isEditing ? (
          <ProfileEditForm
            key="edit"
            initialData={{
              hourly_rate: profile.hourly_rate || '0.00',
              role: profile.role || '',
              phone: profile.phone || '',
              access_level: profile.access_level || 'Standard'
            }}
            onSave={handleSaveProfile}
            onCancel={() => setIsEditing(false)}
            isLoading={isLoading}
          />
        ) : (
          <ProfileView key="view" profile={profile} onEditClick={() => setIsEditing(true)} />
        )}
      </AnimatePresence>
    );
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements />
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
      <div style={{ position: 'relative', zIndex: 10, padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <ProfileHeader username={profile?.username} />
        <motion.div variants={itemVariants} style={glassStyle}>
          {renderContent()}
        </motion.div>
      </div>
      <style jsx global>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Profile;
import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundElements from "../components/HeroSection/BackgroundElements"; // Assuming this path is correct
import {
  UserCog,
  UserCircle,
  Euro,
  Briefcase,
  ShieldCheck,
  Phone as PhoneIcon,
  Edit3,
  Save,
  XCircle,
  Loader2,
  Settings2,
  KeyRound
} from "lucide-react";

// Estilos glass (similar to other components)
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.05)', // Slightly less transparent for content readability
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  padding: '2rem', // Increased padding
};

// Variantes de animação
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 120, damping: 15 } // Adjusted spring
  }
};

const formContainerVariants = {
  hidden: { opacity: 0, height: 0, y: -20 },
  visible: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, height: 0, y: -20, transition: { duration: 0.3 } }
};


const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    hourly_rate: "",
    role: "",
    phone: "",
    access_level: "",
    productivity_metrics: "", // Kept for data integrity, not displayed/editable in this version
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profiles/');
      
      if (response.data.length > 0) {
        const profileData = response.data[0];
        setProfile(profileData);
        setFormData({
          hourly_rate: profileData.hourly_rate || '0.00',
          role: profileData.role || 'N/A',
          phone: profileData.phone || '',
          access_level: profileData.access_level || 'Standard',
          productivity_metrics: typeof profileData.productivity_metrics === 'object' 
            ? JSON.stringify(profileData.productivity_metrics) 
            : profileData.productivity_metrics || '{}'
        });
      } else {
        toast.info("A configurar o seu perfil pela primeira vez.");
        const defaultProfile = {
          hourly_rate: '0.00',
          role: 'Novo Utilizador',
          phone: '',
          access_level: 'Standard',
          productivity_metrics: {}
        };
        
        try {
          const createResponse = await api.post('/profiles/', defaultProfile);
          setProfile(createResponse.data);
          setFormData({
            hourly_rate: createResponse.data.hourly_rate,
            role: createResponse.data.role,
            phone: createResponse.data.phone,
            access_level: createResponse.data.access_level,
            productivity_metrics: typeof createResponse.data.productivity_metrics === 'object'
              ? JSON.stringify(createResponse.data.productivity_metrics)
              : createResponse.data.productivity_metrics
          });
        } catch (createError) {
          console.error("Erro na criação do perfil:", createError);
          toast.error(`Falha ao criar perfil: ${createError.response?.data?.detail || createError.message}`);
        }
      }
    } catch (error) {
      console.error("Erro com o perfil:", error);
      toast.error(`Falha ao carregar ou criar perfil: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate) || 0.00,
        productivity_metrics:
          typeof formData.productivity_metrics === "string" && formData.productivity_metrics.trim() !== ""
            ? JSON.parse(formData.productivity_metrics)
            : {},
      };

      if (profile?.id) {
        await api.put(`/profiles/${profile.id}/`, submissionData);
        toast.success("Perfil atualizado com sucesso.");
      } else {
        // This case should ideally be handled by the initial fetch/create logic
        // but as a fallback:
        const created = await api.post("/profiles/", submissionData);
        setProfile(created.data); // Update profile state with newly created one
        toast.success("Perfil criado com sucesso.");
      }
      setEditing(false);
      await fetchProfile(); // Refetch to ensure data consistency
    } catch (error) {
      console.error("Erro ao submeter perfil:", error);
      const errorMsg = error.response?.data;
      let displayError = "Falha ao atualizar perfil.";
      if (typeof errorMsg === 'object' && errorMsg !== null) {
        displayError = Object.entries(errorMsg)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ');
      } else if (typeof errorMsg === 'string') {
        displayError = errorMsg;
      }
      toast.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // Reset form data to current profile state if a profile exists
    if (profile) {
      setFormData({
        hourly_rate: profile.hourly_rate || '0.00',
        role: profile.role || 'N/A',
        phone: profile.phone || '',
        access_level: profile.access_level || 'Standard',
        productivity_metrics: typeof profile.productivity_metrics === 'object' 
          ? JSON.stringify(profile.productivity_metrics) 
          : profile.productivity_metrics || '{}'
      });
    }
  };


  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements businessStatus="optimal" />
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="dark"
        style={{ zIndex: 9999 }}
      />

      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={containerVariants} 
        style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem', maxWidth: '768px', margin: '0 auto' }}
      >
        <motion.div 
          variants={itemVariants} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <UserCog size={36} style={{ color: 'rgb(147, 51, 234)' }}/>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Gestão de Perfil
              </h1>
              <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>
                Veja e atualize os seus dados pessoais e profissionais.
              </p>
            </div>
          </div>
        </motion.div>

        {loading && !profile ? ( // Initial loading state
          <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', ...glassStyle }}>
            <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} />
            <p style={{ marginLeft: '1rem', fontSize: '1.25rem' }}>A carregar perfil...</p>
          </motion.div>
        ) : !profile && !loading ? ( // No profile found and not loading (error case)
             <motion.div variants={itemVariants} style={{ ...glassStyle, textAlign: 'center', padding: '3rem' }}>
                <ShieldCheck size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Perfil Não Encontrado</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Não foi possível carregar ou criar o seu perfil. Tente atualizar a página ou contacte o suporte.
                </p>
            </motion.div>
        ) : (
          <motion.div variants={itemVariants} style={glassStyle}>
            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <UserCircle size={32} style={{ color: 'rgb(59, 130, 246)' }} />
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: 'white' }}>Nome de Utilizador</h2>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
                        {profile?.username || "Não disponível"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    {[
                      { label: "Taxa Horária", value: `${profile?.hourly_rate || '0.00'} €/hora`, icon: <Euro size={20} /> },
                      { label: "Função", value: profile?.role || "Não especificado", icon: <Briefcase size={20} /> },
                      { label: "Nível de Acesso", value: profile?.access_level || "Não especificado", icon: <KeyRound size={20} /> },
                      { label: "Telefone", value: profile?.phone || "Não especificado", icon: <PhoneIcon size={20} /> },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ color: 'rgb(147, 51, 234)' }}>{item.icon}</div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{item.label}</h3>
                          <p style={{ margin: 0, color: 'white', fontSize: '1rem' }}>
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    onClick={() => setEditing(true)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(59,130,246,0.2)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      width: '100%', // Make button full width on smaller screens
                      maxWidth: '200px', // Max width for larger screens
                      margin: '0 auto', // Center button
                      justifyContent: 'center'
                    }}
                    disabled={loading}
                  >
                    <Edit3 size={18} /> Editar Perfil
                  </motion.button>
                </motion.div>
              ) : (
                <motion.form
                  key="edit"
                  variants={formContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onSubmit={handleSubmit}
                >
                  {[
                    { name: "hourly_rate", label: "Taxa Horária (€)", type: "number", step: "0.01", min: "0", icon: <Euro size={18}/> },
                    { name: "role", label: "Função", type: "text", placeholder: "Ex: Developer, Manager", icon: <Briefcase size={18}/> },
                    { name: "phone", label: "Telefone", type: "tel", placeholder: "Ex: +351912345678", icon: <PhoneIcon size={18}/> },
                    { name: "access_level", label: "Nível de Acesso", type: "text", placeholder: "Ex: Standard, Admin", icon: <KeyRound size={18}/> },
                  ].map(field => (
                    <div key={field.name} style={{ marginBottom: '1.5rem' }}>
                      <label
                        htmlFor={field.name}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}
                      >
                        {field.icon} {field.label}
                      </label>
                      <input
                        type={field.type}
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        step={field.step}
                        min={field.min}
                        placeholder={field.placeholder}
                        style={{
                            width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', 
                            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', 
                            color: 'white', fontSize: '0.875rem'
                        }}
                        required={field.name === "hourly_rate" || field.name === "role"} // Example: make some fields required
                      />
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <motion.button
                      type="button"
                      onClick={handleCancelEdit}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
                        color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                      }}
                      disabled={loading}
                    >
                      <XCircle size={18} /> Cancelar
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '0.75rem 1.5rem', background: 'rgba(52,211,153,0.2)',
                        border: '1px solid rgba(52,211,153,0.3)', borderRadius: '8px',
                        color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                      }}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Guardar Alterações
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px rgba(0,0,0,0.2) inset !important; /* Adjust background color for autofill */
            -webkit-text-fill-color: white !important; /* Adjust text color for autofill */
            transition: background-color 5000s ease-in-out 0s; /* Prevents quick flash */
        }
        
        input::placeholder { color: rgba(255,255,255,0.4) !important; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
        
        * { 
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease; 
        }
        
        button:focus, input:focus, select:focus, textarea:focus { 
            outline: 2px solid rgba(59,130,246,0.5); 
            outline-offset: 2px;
            border-color: rgba(59,130,246,0.5) !important; /* Ensure border highlights on focus */
        }
      `}</style>
    </div>
  );
};

export default Profile;


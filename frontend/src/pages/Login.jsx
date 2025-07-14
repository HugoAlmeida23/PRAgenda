import React from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Clock,
    Users,
    Shield
} from 'lucide-react';
import Form from "../components/Form";

// Background Component (same as original)
const LoginBackground = () => {
    const particles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 4,
        size: 4 + Math.random() * 8
    }));

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
            zIndex: -1
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgb(30, 67, 128) 0%, rgb(35, 13, 56) 50%, rgb(7, 92, 107) 100%)'
            }} />
            
            <motion.div 
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.4
                }}
                animate={{
                    background: [
                        'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
                        'radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
                        'radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)'
                    ]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse"
                }}
            />

            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    style={{
                        position: 'absolute',
                        width: '6px',
                        height: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        left: `${particle.x}%`,
                        top: `${particle.y}%`
                    }}
                    animate={{
                        y: [-particle.size, particle.size],
                        x: [-particle.size/2, particle.size/2],
                        opacity: [0.1, 0.4, 0.1],
                        scale: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: particle.delay,
                        ease: "easeInOut"
                    }}
                />
            ))}

            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.02,
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
            }} />
        </div>
    );
};

function Login() {
    const features = [
        {
            icon: TrendingUp,
            title: "Análise de Rentabilidade",
            description: "Identifique quais clientes são mais lucrativos"
        },
        {
            icon: Clock,
            title: "Registo de Tempo",
            description: "Monitorize o tempo gasto em cada cliente"
        },
        {
            icon: Users,
            title: "Gestão de Equipas",
            description: "Organize tarefas e colaboradores eficientemente"
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            position: 'relative',
            color: 'white'
        }}>
            <LoginBackground />
            
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                minHeight: '100vh'
            }}>
                {/* Left Side - Branding & Features */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '3rem 2rem',
                    position: 'relative'
                }}>
                    {/* Logo/Brand */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{ marginBottom: '3rem' }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgb(147, 51, 234), rgb(196, 181, 253))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '1.5rem'
                            }}>
                                T
                            </div>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                margin: 0,
                                background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                FlowTask
                            </h1>
                        </div>
                        
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            margin: '0 0 1rem 0',
                            lineHeight: 1.2
                        }}>
                            Otimize a gestão do seu escritório de contabilidade
                        </h2>
                        
                        <p style={{
                            fontSize: '1.125rem',
                            color: 'rgba(255, 255, 255, 0.8)',
                            margin: '0 0 2rem 0',
                            lineHeight: 1.6
                        }}>
                            Controle rentabilidade, organize tarefas e maximize a eficiência 
                            da sua equipa com inteligência artificial.
                        </p>
                    </motion.div>

                    {/* Features */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}>
                                    <feature.icon size={24} />
                                </div>
                                <div>
                                    <h3 style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        margin: '0 0 0.25rem 0'
                                    }}>
                                        {feature.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.875rem',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        margin: 0
                                    }}>
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Right Side - Login Form Container */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '16px',
                            padding: '2.5rem',
                            width: '100%',
                            maxWidth: '400px'
                        }}
                    >
                        {/* Enhanced Form Header */}
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                margin: '0 0 0.5rem 0'
                            }}>
                                Iniciar Sessão
                            </h3>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                margin: 0,
                                fontSize: '0.875rem'
                            }}>
                                Aceda à sua conta para continuar
                            </p>
                        </div>

                        {/* Use the existing Form component */}
                        <Form route="/token/" method="login" />

                        {/* Security Notice */}
                        <div style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem'
                            }}>
                                <Shield size={16} style={{ color: 'rgb(52, 211, 153)' }} />
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: 'rgb(52, 211, 153)'
                                }}>
                                    Seguro e Confiável
                                </span>
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.6)',
                                margin: 0,
                                lineHeight: 1.4
                            }}>
                                Os seus dados estão protegidos com encriptação de nível bancário.
                                Cumprimos todas as normas RGPD.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 768px) {
                    .container {
                        grid-template-columns: 1fr;
                    }
                    
                    .left-panel {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default Login;
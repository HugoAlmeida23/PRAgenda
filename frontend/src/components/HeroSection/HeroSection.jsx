import DashboardPages from './DashboardPages';

const HeroSection = ({ dashboardData, stats }) => {
    return (
        <DashboardPages 
            dashboardData={dashboardData} 
            stats={stats} 
        />
    );
};

export default HeroSection;
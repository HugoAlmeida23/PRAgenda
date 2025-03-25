import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  FilterX,
  Search,
  Settings,
} from "lucide-react";
import "../styles/Home.css";
import Header from "../components/Header";
import api from "../api";

const LegalNotificationsDashboard = () => {
  const [loading, setLoading] = useState(true);

  return (
    <div className="main">
      <Header />
      <div
        className="p-6 bg-gray-100 min-h-screen"
        style={{ marginLeft: "3%" }}
      >
      </div>
    </div>
  );
};

export default LegalNotificationsDashboard;

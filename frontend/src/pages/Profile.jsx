import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    hourly_rate: "",
    role: "",
    phone: "",
    access_level: "",
    productivity_metrics: "",
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
        // Profile exists, use it
        const profileData = response.data[0];
        setProfile(profileData);
        setFormData({
          hourly_rate: profileData.hourly_rate,
          role: profileData.role,
          phone: profileData.phone,
          access_level: profileData.access_level,
          productivity_metrics: typeof profileData.productivity_metrics === 'object' 
            ? JSON.stringify(profileData.productivity_metrics) 
            : profileData.productivity_metrics
        });
      } else {
        // No profile exists, create one
        toast.info("Setting up your profile for the first time");
        
        // Default profile with minimal required fields
        const defaultProfile = {
          hourly_rate: '0.00',
          role: 'New User',
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
          console.error("Profile creation error:", createError);
          console.log("Error response:", createError.response?.data);
          toast.error("Failed to create profile");
        }
      }
    } catch (error) {
      console.error("Error with profile:", error);
      console.log("Error response data:", error.response?.data);
      toast.error("Failed to load or create profile");
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
    try {
      setLoading(true);

      // Prepare the data for submission
      const submissionData = {
        ...formData,
        // Parse the productivity_metrics back to an object if it's a string
        productivity_metrics:
          typeof formData.productivity_metrics === "string"
            ? JSON.parse(formData.productivity_metrics)
            : formData.productivity_metrics,
      };

      if (profile?.id) {
        await api.put(`profiles/${profile.id}/`, submissionData);
        toast.success("Profile updated successfully.");
      } else {
        await api.post("profiles/", submissionData);
        toast.success("Profile created successfully.");
      }
      setEditing(false);
      await fetchProfile();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main">
      <Header>
      <div
        className="p-6 bg-gray-100 min-h-screen"
        style={{ marginLeft: "3%" }}
      >
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">Profile Management</h1>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {!editing ? (
                <>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">User</h2>
                    <p className="text-gray-700">
                      {profile?.username}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <h3 className="font-medium">Hourly Rate</h3>
                      <p className="text-gray-700">
                        {profile?.hourly_rate} €/hour
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Role</h3>
                      <p className="text-gray-700">
                        {profile?.role || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Access Level</h3>
                      <p className="text-gray-700">
                        {profile?.access_level || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Phone</h3>
                      <p className="text-gray-700">
                        {profile?.phone || "Not specified"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditing(true)}
                    className="bg-blue-600 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                  >
                    Edit Profile
                  </button>
                </>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label
                      className="block text-gray-700 mb-2"
                      htmlFor="hourly_rate"
                    >
                      Hourly Rate (€)
                    </label>
                    <input
                      type="number"
                      id="hourly_rate"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="role">
                      Role
                    </label>
                    <input
                      type="text"
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2" htmlFor="phone">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="mb-6">
                    <label
                      className="block text-gray-700 mb-2"
                      htmlFor="access_level"
                    >
                      Access Level
                    </label>
                    <input
                      type="text"
                      id="access_level"
                      name="access_level"
                      value={formData.access_level}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex space-x-4 ">
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-600 text-white px-4 py-2 rounded-md mr-2"
                      disabled={loading}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="bg-gray-600 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
      </Header>
    </div>
  );
};

export default Profile;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Favourites from './pages/Favourites';
import Bookings from './pages/Bookings';
import Notifications from './pages/Notifications';
import Billing from './pages/Billing';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import AdminDashboard from './pages/AdminDashboard';
import AdminFlights from './pages/AdminFlights';
import AdminHotels from './pages/AdminHotels';
import AdminCars from './pages/AdminCars';
import AdminUsers from './pages/AdminUsers';
import AdminUserForm from './pages/AdminUserForm';
import AdminFlightForm from './pages/AdminFlightForm';
import AdminHotelForm from './pages/AdminHotelForm';
import AdminCarForm from './pages/AdminCarForm';
import AdminBookings from './pages/AdminBookings';
import HotelDetails from './pages/HotelDetails';
import { ToastProvider } from './context/ToastContext';
import AIChatModal from './components/AIChatModal';

function App() {
  return (
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <div className="App flex flex-col min-h-screen">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route
              path="/admin/*"
              element={
                <Routes>
                  <Route
                    path="dashboard"
                    element={
                      <ProtectedAdminRoute>
                        <AdminDashboard />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="flights"
                    element={
                      <ProtectedAdminRoute>
                        <AdminFlights />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="flights/new"
                    element={
                      <ProtectedAdminRoute>
                        <AdminFlightForm />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="flights/:id/edit"
                    element={
                      <ProtectedAdminRoute>
                        <AdminFlightForm />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="hotels"
                    element={
                      <ProtectedAdminRoute>
                        <AdminHotels />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="hotels/new"
                    element={
                      <ProtectedAdminRoute>
                        <AdminHotelForm />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="hotels/:id/edit"
                    element={
                      <ProtectedAdminRoute>
                        <AdminHotelForm />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="cars"
                    element={
                      <ProtectedAdminRoute>
                        <AdminCars />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="cars/new"
                    element={
                      <ProtectedAdminRoute>
                        <AdminCarForm />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="cars/:id/edit"
                    element={
                      <ProtectedAdminRoute>
                        <AdminCarForm />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={
                      <ProtectedAdminRoute>
                        <AdminUsers />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="users/:id/edit"
                    element={
                      <ProtectedAdminRoute>
                        <AdminUserForm />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="bookings"
                    element={
                      <ProtectedAdminRoute>
                        <AdminBookings />
                      </ProtectedAdminRoute>
                    }
                  />
                </Routes>
              }
            />
            
            {/* User Routes */}
            <Route
              path="/*"
              element={
                <>
                  <Header />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/search" element={<SearchResults />} />
                      <Route path="/hotels/:id" element={<HotelDetails />} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/bookings"
                        element={
                          <ProtectedRoute>
                            <Bookings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/favourites"
                        element={
                          <ProtectedRoute>
                            <Favourites />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notifications"
                        element={
                          <ProtectedRoute>
                            <Notifications />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/billing"
                        element={
                          <ProtectedRoute>
                            <Billing />
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </main>
                  <Footer />
                </>
              }
            />
          </Routes>
        </div>
        <AIChatModal />
      </Router>
    </ToastProvider>
  );
}

export default App;


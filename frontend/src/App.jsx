import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PortalAuthProvider } from './context/PortalAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PortalProtectedRoute from './components/PortalProtectedRoute';
import CookieBanner from './components/CookieBanner';
import ScrollToTop from './components/ScrollToTop';
import PwaInstallPrompt from './components/PwaInstallPrompt';

// Eagerly loaded — needed immediately on first paint
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy loaded — only fetched when the route is visited
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const Profile         = lazy(() => import('./pages/Profile'));
const Brands          = lazy(() => import('./pages/Brands'));
const BrandDetails    = lazy(() => import('./pages/BrandDetails'));
const Clients         = lazy(() => import('./pages/Clients'));
const NewClient       = lazy(() => import('./pages/NewClient'));
const ClientDetails   = lazy(() => import('./pages/ClientDetails'));
const Documents       = lazy(() => import('./pages/Documents'));
const DocumentDetails = lazy(() => import('./pages/DocumentDetails'));
const Messages        = lazy(() => import('./pages/Messages'));
const Projects        = lazy(() => import('./pages/Projects'));
const NewProject      = lazy(() => import('./pages/NewProject'));
const ProjectDetails  = lazy(() => import('./pages/ProjectDetails'));
const Invoices        = lazy(() => import('./pages/Invoices'));
const InvoiceDetails  = lazy(() => import('./pages/InvoiceDetails'));
const Subscriptions   = lazy(() => import('./pages/Subscriptions'));
const Proposals       = lazy(() => import('./pages/Proposals'));
const ProposalDetails = lazy(() => import('./pages/ProposalDetails'));
const TimeTracking    = lazy(() => import('./pages/TimeTracking'));
const Pipeline        = lazy(() => import('./pages/Pipeline'));
const Analytics       = lazy(() => import('./pages/Analytics'));
const Tasks           = lazy(() => import('./pages/Tasks'));
const PublicInvoice   = lazy(() => import('./pages/PublicInvoice'));
const SuperAdmin      = lazy(() => import('./pages/SuperAdmin'));
const Contact         = lazy(() => import('./pages/Contact'));
const Contracts          = lazy(() => import('./pages/Contracts'));
const ContractDetails    = lazy(() => import('./pages/ContractDetails'));
const CallLogs           = lazy(() => import('./pages/CallLogs'));
const Calendar           = lazy(() => import('./pages/Calendar'));
const BookingPages       = lazy(() => import('./pages/BookingPages'));
const PublicBooking      = lazy(() => import('./pages/PublicBooking'));
const Tickets            = lazy(() => import('./pages/Tickets'));
const TicketDetails      = lazy(() => import('./pages/TicketDetails'));
const LeadForms          = lazy(() => import('./pages/LeadForms'));
const LeadSubmissions    = lazy(() => import('./pages/LeadSubmissions'));
const PublicLeadForm     = lazy(() => import('./pages/PublicLeadForm'));
const Segments           = lazy(() => import('./pages/Segments'));
const Campaigns          = lazy(() => import('./pages/Campaigns'));
const CampaignDetails    = lazy(() => import('./pages/CampaignDetails'));
const EmailConnections   = lazy(() => import('./pages/EmailConnections'));
const SmsInbox           = lazy(() => import('./pages/SmsInbox'));
const SmsBroadcast       = lazy(() => import('./pages/SmsBroadcast'));
const Automations        = lazy(() => import('./pages/Automations'));
const WorkflowBuilder    = lazy(() => import('./pages/WorkflowBuilder'));
const CMS                    = lazy(() => import('./pages/CMS'));
const CMSEditor              = lazy(() => import('./pages/CMSEditor'));
const Social                 = lazy(() => import('./pages/Social'));
const SocialAnalytics        = lazy(() => import('./pages/SocialAnalytics'));
const PublicContentReview    = lazy(() => import('./pages/PublicContentReview'));
const BrandVoice             = lazy(() => import('./pages/BrandVoice'));
const Reputation             = lazy(() => import('./pages/Reputation'));
const ServicePackages        = lazy(() => import('./pages/ServicePackages'));
const ClientReports          = lazy(() => import('./pages/ClientReports'));
const Workload               = lazy(() => import('./pages/Workload'));
const Funnels                = lazy(() => import('./pages/Funnels'));
const FunnelBuilder          = lazy(() => import('./pages/FunnelBuilder'));
const PublicFunnelPage       = lazy(() => import('./pages/PublicFunnelPage'));
const EmailSequences         = lazy(() => import('./pages/EmailSequences'));
const EmailSequenceEditor    = lazy(() => import('./pages/EmailSequenceEditor'));
const ChatWidget             = lazy(() => import('./pages/ChatWidget'));
const Surveys                = lazy(() => import('./pages/Surveys'));
const SurveyResponse         = lazy(() => import('./pages/SurveyResponse'));
const EmailInbox             = lazy(() => import('./pages/EmailInbox'));
const TeamPerformance        = lazy(() => import('./pages/TeamPerformance'));

// Policy pages — rarely visited, no reason to be in main bundle
const PrivacyPolicy           = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService          = lazy(() => import('./pages/TermsOfService'));
const CookiePolicy            = lazy(() => import('./pages/CookiePolicy'));
const AcceptableUsePolicy     = lazy(() => import('./pages/AcceptableUsePolicy'));
const RefundPolicy            = lazy(() => import('./pages/RefundPolicy'));
const DataProcessingAgreement = lazy(() => import('./pages/DataProcessingAgreement'));
const BillingTerms            = lazy(() => import('./pages/BillingTerms'));
const SecurityPolicy          = lazy(() => import('./pages/SecurityPolicy'));
const ServiceLevelAgreement   = lazy(() => import('./pages/ServiceLevelAgreement'));

// Portal pages — separate user flow, no reason to include in agency bundle
const PortalLogin     = lazy(() => import('./pages/portal/PortalLogin'));
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard'));
const PortalProjects  = lazy(() => import('./pages/portal/PortalProjects'));
const PortalDocuments = lazy(() => import('./pages/portal/PortalDocuments'));
const PortalInvoices  = lazy(() => import('./pages/portal/PortalInvoices'));
const PortalMessages  = lazy(() => import('./pages/portal/PortalMessages'));
const PortalProposals  = lazy(() => import('./pages/portal/PortalProposals'));
const PortalContracts  = lazy(() => import('./pages/portal/PortalContracts'));
const PortalTickets    = lazy(() => import('./pages/portal/PortalTickets'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
  </div>
);

const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user?.is_superadmin) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <PortalAuthProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Agency Public Routes ── */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* ── Agency Protected Routes ── */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Brand Management */}
              <Route path="/brands" element={<ProtectedRoute><Brands /></ProtectedRoute>} />
              <Route path="/brands/:id" element={<ProtectedRoute><BrandDetails /></ProtectedRoute>} />

              {/* Client Management */}
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/clients/new" element={<ProtectedRoute><NewClient /></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />

              {/* Project Management */}
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
              <Route path="/projects/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />

              {/* Document Management */}
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetails /></ProtectedRoute>} />

              {/* Messaging */}
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

              {/* Invoice Management */}
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetails /></ProtectedRoute>} />

              {/* Proposals */}
              <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
              <Route path="/proposals/:id" element={<ProtectedRoute><ProposalDetails /></ProtectedRoute>} />
              {/* Contracts */}
              <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
              <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetails /></ProtectedRoute>} />

              {/* Time Tracking */}
              <Route path="/time" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />

              {/* Sales Power Pack */}
              <Route path="/pipeline"  element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/team-performance" element={<ProtectedRoute><TeamPerformance /></ProtectedRoute>} />
              <Route path="/surveys"   element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
              <Route path="/survey/:token" element={<SurveyResponse />} />
              <Route path="/tasks"     element={<ProtectedRoute><Tasks /></ProtectedRoute>} />

              {/* Subscriptions */}
              <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />

              {/* CRM Features */}
              <Route path="/call-logs"             element={<ProtectedRoute><CallLogs /></ProtectedRoute>} />
              <Route path="/calendar"              element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              <Route path="/booking-pages"         element={<ProtectedRoute><BookingPages /></ProtectedRoute>} />
              <Route path="/tickets"               element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/tickets/:ticketId"     element={<ProtectedRoute><TicketDetails /></ProtectedRoute>} />
              <Route path="/lead-forms"            element={<ProtectedRoute><LeadForms /></ProtectedRoute>} />
              <Route path="/lead-forms/:formId/submissions" element={<ProtectedRoute><LeadSubmissions /></ProtectedRoute>} />
              <Route path="/segments"              element={<ProtectedRoute><Segments /></ProtectedRoute>} />
              <Route path="/campaigns"             element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/campaigns/:campaignId" element={<ProtectedRoute><CampaignDetails /></ProtectedRoute>} />
              <Route path="/email-connections"     element={<ProtectedRoute><EmailConnections /></ProtectedRoute>} />
              <Route path="/email-inbox"          element={<ProtectedRoute><EmailInbox /></ProtectedRoute>} />
              <Route path="/sms"                  element={<ProtectedRoute><SmsInbox /></ProtectedRoute>} />
              <Route path="/sms-broadcasts"       element={<ProtectedRoute><SmsBroadcast /></ProtectedRoute>} />
              <Route path="/automations"          element={<ProtectedRoute><Automations /></ProtectedRoute>} />
              <Route path="/workflows/:workflowId" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />

              {/* Content Management */}
              <Route path="/cms"                           element={<ProtectedRoute><CMS /></ProtectedRoute>} />
              <Route path="/cms/editor/:siteId/:pageId"   element={<ProtectedRoute><CMSEditor /></ProtectedRoute>} />

              {/* Social Media */}
              <Route path="/social"            element={<ProtectedRoute><Social /></ProtectedRoute>} />
              <Route path="/social/analytics"  element={<ProtectedRoute><SocialAnalytics /></ProtectedRoute>} />

              {/* Brand & Agency tools */}
              <Route path="/brand-voice"        element={<ProtectedRoute><BrandVoice /></ProtectedRoute>} />
              <Route path="/packages"           element={<ProtectedRoute><ServicePackages /></ProtectedRoute>} />
              <Route path="/client-reports"     element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
              <Route path="/workload"           element={<ProtectedRoute><Workload /></ProtectedRoute>} />
              <Route path="/reputation"         element={<ProtectedRoute><Reputation /></ProtectedRoute>} />
              <Route path="/funnels"            element={<ProtectedRoute><Funnels /></ProtectedRoute>} />
              <Route path="/funnels/:funnelId"  element={<ProtectedRoute><FunnelBuilder /></ProtectedRoute>} />
              <Route path="/sequences"          element={<ProtectedRoute><EmailSequences /></ProtectedRoute>} />
              <Route path="/sequences/:sequenceId" element={<ProtectedRoute><EmailSequenceEditor /></ProtectedRoute>} />
              <Route path="/chat-widget"        element={<ProtectedRoute><ChatWidget /></ProtectedRoute>} />

              {/* ── Public (no auth) ── */}
              <Route path="/review/cms/:token"    element={<PublicContentReview type="cms" />} />
              <Route path="/review/social/:token" element={<PublicContentReview type="social" />} />
              <Route path="/pay/:token" element={<PublicInvoice />} />
              <Route path="/book/:slug" element={<PublicBooking />} />
              <Route path="/f/:slug"    element={<PublicLeadForm />} />
              <Route path="/lp/:funnelSlug"           element={<PublicFunnelPage />} />
              <Route path="/lp/:funnelSlug/:stepSlug" element={<PublicFunnelPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/acceptable-use-policy" element={<AcceptableUsePolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/data-processing-agreement" element={<DataProcessingAgreement />} />
              <Route path="/billing-terms" element={<BillingTerms />} />
              <Route path="/security-policy" element={<SecurityPolicy />} />
              <Route path="/service-level-agreement" element={<ServiceLevelAgreement />} />
              <Route path="/contact" element={<Contact />} />

              {/* ── Client Portal Routes ── */}
              <Route path="/portal/login" element={<PortalLogin />} />
              <Route path="/portal/dashboard" element={<PortalProtectedRoute><PortalDashboard /></PortalProtectedRoute>} />
              <Route path="/portal/projects" element={<PortalProtectedRoute><PortalProjects /></PortalProtectedRoute>} />
              <Route path="/portal/documents" element={<PortalProtectedRoute><PortalDocuments /></PortalProtectedRoute>} />
              <Route path="/portal/invoices" element={<PortalProtectedRoute><PortalInvoices /></PortalProtectedRoute>} />
              <Route path="/portal/messages" element={<PortalProtectedRoute><PortalMessages /></PortalProtectedRoute>} />
              <Route path="/portal/proposals" element={<PortalProtectedRoute><PortalProposals /></PortalProtectedRoute>} />
              <Route path="/portal/contracts" element={<PortalProtectedRoute><PortalContracts /></PortalProtectedRoute>} />
              <Route path="/portal/tickets"   element={<PortalProtectedRoute><PortalTickets /></PortalProtectedRoute>} />
              <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />

              {/* ── Superadmin (hidden, no nav link) ── */}
              <Route path="/superadmin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />

              {/* ── Default / 404 ── */}
              <Route path="/" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <ScrollToTop />
          <CookieBanner />
          <PwaInstallPrompt />
        </AuthProvider>
      </PortalAuthProvider>
    </Router>
  );
}

export default App;

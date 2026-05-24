import { Route } from "react-router";
import { all_routes, auth_routes } from "./all_routes";

import ComingSoon from "../pages/comingSoon";
import ResetPasswordSuccess from "../auth/resetPasswordSuccess/resetPasswordSuccess";
import Notes from "../notes/index";
import TakeNotes from "../notes/TakeNote";
import Assistant from "../assistant/index";
import Login from "../auth/login/login";
import Logout from "../auth/logout/logout";
import Register from "../auth/register/register";
import VerifyRegisteration from "../auth/register/verifyRegisteration";
import VerificationSuccess from "../auth/register/verificationSuccess";
import TwoStepVerification from "../auth/twoStepVerification/twoStepVerification";
import ResetPassword from "../auth/resetPassword/resetPassword";
import ForgotPassword from "../auth/forgotPassword/forgotPassword";
import ForgotPasswordSuccess from "../auth/forgotPassword/forgotPasswordSuccess";
import Error404 from "../pages/error/error-404";
import Error500 from "../pages/error/error-500";
import UnderMaintenance from "../pages/underMaintenance";
import LockScreen from "../auth/lockScreen";
import Profile from "../profile/index";

const routes = all_routes;

export const publicRoutes = [
   {
    path: routes.noteList,
    element: <Notes />,
  },
  {
    path: routes.takeNotes,
    element: <TakeNotes />,
  },
   {
    path: routes.assistant,
    element: <Assistant />,
  },
  {
    path: routes.profile,
    element: <Profile />,
  }
].filter((route) => {
  if (route.path === routes.assistant && process.env.REACT_APP_ENABLE_AI === 'false') {
    return false;
  }
  return true;
});

export const authRoutes = [
  {
    path: auth_routes.login,
    element: <Login />,
    route: Route,
  },
  {
    path: auth_routes.register,
    element: <Register />,
    route: Route,
  },
  {
    path: auth_routes.verifyRegisteration,
    element: <VerifyRegisteration />,
    route: Route,
  },
  {
    path: auth_routes.verificationSuccess,
    element: <VerificationSuccess />,
    route: Route,
  },
  {
    path: auth_routes.twoStepVerification,
    element: <TwoStepVerification />,
    route: Route,
  },

  {
    path: auth_routes.register,
    element: <Register />,
    route: Route,
  },
  {
    path: auth_routes.resetPassword,
    element: <ResetPassword />,
    route: Route,
  },
  {
    path: auth_routes.forgotPassword,
    element: <ForgotPassword />,
    route: Route,
  },
  {
    path: auth_routes.forgotPasswordSuccess,
    element: <ForgotPasswordSuccess />,
    route: Route,
  },
  {
    path: auth_routes.resetPasswordSuccess,
    element: <ResetPasswordSuccess />,
  },
];

export const errorsAndLogoutRoutes = [
  {
    path: routes.logout,
    element: <Logout />,
    route: Route,
  },
  {
    path: routes.error404,
    element: <Error404 />,
    route: Route,
  },
  {
    path: routes.error500,
    element: <Error500 />,
    route: Route,
  },
  {
    path: routes.underMaintenance,
    element: <UnderMaintenance />,
    route: Route,
  },
  {
    path: routes.lockScreen,
    element: <LockScreen />,
  },
    {
    path: routes.comingSoon,
    element: <ComingSoon />,
    route: Route,
  },
];
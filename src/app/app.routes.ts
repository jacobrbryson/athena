import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { Home } from './pages/home/home';
import { Kids } from './pages/kids/kids';
import { Login } from './pages/login/login';
import { Parents } from './pages/parents/parents';
import { SeeHowAthenaLearns } from './pages/see-how-athena-learns/see-how-athena-learns';
import { Teachers } from './pages/teachers/teachers';
import { TryIt } from './pages/try-it/try-it';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Athena | AI Companion',
  },
  {
    path: 'kids',
    component: Kids,
    title: 'Athena | For Kids',
  },
  {
    path: 'parents',
    component: Parents,
    title: 'Athena | For Parents',
  },
  {
    path: 'teachers',
    component: Teachers,
    title: 'Athena | For Teachers',
  },
  {
    path: 'see-how-athena-learns',
    component: SeeHowAthenaLearns,
    title: 'Athena | See How Athena Learns',
  },
  {
    path: 'dashboard',
    component: TryIt,
    title: 'Athena | Dashboard',
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    component: Login,
    title: 'Athena | Login',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

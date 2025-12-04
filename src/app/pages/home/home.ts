import { Component } from '@angular/core';
import { Headline } from './sections/headline/headline';
import { Kids } from 'src/app/pages/home/sections/kids/kids';
import { Parents } from 'src/app/pages/home/sections/parents/parents';
import { Teachers } from 'src/app/pages/home/sections/teachers/teachers';

@Component({
  selector: 'app-home',
  imports: [Teachers, Parents, Kids, Headline],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}

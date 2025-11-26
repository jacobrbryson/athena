import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { asset } from 'src/app/asset';

@Component({
  selector: 'app-headline',
  imports: [RouterLink],
  templateUrl: './headline.html',
  styleUrl: './headline.css',
})
export class Headline {
  asset = asset;
}

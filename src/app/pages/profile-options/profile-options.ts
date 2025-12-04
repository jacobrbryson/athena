import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-profile-options',
  standalone: true,
  imports: [CommonModule, RouterModule, Breadcrumb],
  templateUrl: './profile-options.html',
  styleUrl: './profile-options.css',
})
export class ProfileOptions {
  childUuid = this.route.snapshot.paramMap.get('uuid') || '';

  constructor(private route: ActivatedRoute) {}
}

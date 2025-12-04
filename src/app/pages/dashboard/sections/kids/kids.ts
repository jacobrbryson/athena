import { Component } from '@angular/core';
import { asset } from 'src/app/asset';
import { Chat } from './sections/chat/chat';
import { Interests } from './sections/interests/interests';
import { LearningTargets } from './sections/learning-targets/learning-targets';

@Component({
  selector: 'app-kids',
  standalone: true,
  templateUrl: './kids.html',
  styleUrls: ['./kids.css'],
  imports: [Chat, LearningTargets, Interests],
})
export class Kids {
  asset = asset;
}

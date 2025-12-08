import { Component } from '@angular/core';
import { asset } from 'src/app/asset';
import { UnityPlayerComponent } from 'src/app/shared/unity/unity';
import { Chat } from './sections/chat/chat';
import { LearningTargets } from './sections/learning-targets/learning-targets';

@Component({
  selector: 'app-kids',
  standalone: true,
  templateUrl: './kids.html',
  styleUrls: ['./kids.css'],
  imports: [Chat, LearningTargets, UnityPlayerComponent],
})
export class Kids {
  asset = asset;
}

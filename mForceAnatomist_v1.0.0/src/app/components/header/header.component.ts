import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  isSolarMode = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.isSolarMode = document.body.classList.contains('solar-mode');
    }
  }

  toggleTheme() {
    if (isPlatformBrowser(this.platformId)) {
      this.isSolarMode = !this.isSolarMode;
      if (this.isSolarMode) {
        document.body.classList.add('solar-mode');
      } else {
        document.body.classList.remove('solar-mode');
      }
    }
  }
}


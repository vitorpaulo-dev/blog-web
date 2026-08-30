import { TuiButton, TuiRoot, TuiTextfield } from '@taiga-ui/core';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, TuiButton, TuiTextfield],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}

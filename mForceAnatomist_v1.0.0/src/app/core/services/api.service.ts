import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<any> {
    // withCredentials ensures the __session cookie is sent
    return this.http.get(`${this.baseUrl}/health`, { withCredentials: true });
  }
}

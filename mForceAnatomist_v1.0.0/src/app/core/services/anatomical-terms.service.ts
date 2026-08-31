import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnatomicalTerm } from '../models/anatomical-terms.model';

@Injectable({
  providedIn: 'root'
})
export class AnatomicalTermService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/anatomical_terms';

  getAll(): Observable<AnatomicalTerm[]> {
    return this.http.get<AnatomicalTerm[]>(this.baseUrl, { withCredentials: true });
  }

  create(item: Partial<AnatomicalTerm>): Observable<AnatomicalTerm> {
    return this.http.post<AnatomicalTerm>(this.baseUrl, item, { withCredentials: true });
  }

  update(id: number, item: Partial<AnatomicalTerm>): Observable<AnatomicalTerm> {
    return this.http.put<AnatomicalTerm>(`${this.baseUrl}/${id}`, item, { withCredentials: true });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, { withCredentials: true });
  }
}

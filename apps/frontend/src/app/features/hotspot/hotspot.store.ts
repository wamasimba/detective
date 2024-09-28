import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, filter, Observable, of, pipe, switchMap, tap } from 'rxjs';

import { HotspotService } from '../../data/hotspot.service';
import {
  AggregatedHotspotsResult,
  ComplexityMetric,
  HotspotCriteria,
  HotspotResult,
  initAggregatedHotspotsResult,
  initHotspotResult,
} from '../../model/hotspot-result';
import { Limits } from '../../model/limits';
import { injectShowError } from '../../utils/error-handler';

export type HotspotFilter = {
  minScore: number;
  metric: ComplexityMetric;
  module: string;
};

export type LoadAggregateOptions = {
  minScore: number;
  metric: ComplexityMetric;
  limits: Limits;
};

export type LoadHotspotOptions = LoadAggregateOptions & {
  selectedModule: string;
};

export const HotspotStore = signalStore(
  { providedIn: 'root' },
  withState({
    filter: {
      minScore: 1,
      metric: 'Length',
      module: '',
    } as HotspotFilter,
    aggregatedResult: initAggregatedHotspotsResult,
    hotspotResult: initHotspotResult,
    loadingAggregated: false,
    loadingHotspots: false,
  }),
  withMethods(
    (
      store,
      hotspotService = inject(HotspotService),
      showError = injectShowError()
    ) => ({
      _loadAggregated(
        options: LoadAggregateOptions
      ): Observable<AggregatedHotspotsResult> {
        const filter = {
          metric: options.metric,
          minScore: options.minScore,
        };

        const criteria: HotspotCriteria = {
          ...filter,
          module: '',
        };

        patchState(store, (state) => ({
          loadingAggregated: true,
          filter: {
            ...state.filter,
            ...filter,
          },
        }));

        return hotspotService.loadAggregated(criteria, options.limits).pipe(
          tap(() => {
            patchState(store, { loadingAggregated: false });
          }),
          catchError((err) => {
            patchState(store, { loadingAggregated: false });
            showError(err);
            return of(initAggregatedHotspotsResult);
          })
        );
      },

      _loadHotspots(options: LoadHotspotOptions): Observable<HotspotResult> {
        const criteria: HotspotCriteria = {
          metric: options.metric,
          minScore: options.minScore,
          module: options.selectedModule,
        };

        patchState(store, {
          loadingHotspots: true,
          filter: criteria,
        });

        return hotspotService.load(criteria, options.limits).pipe(
          tap(() => {
            patchState(store, { loadingHotspots: false });
          }),
          catchError((err) => {
            patchState(store, { loadingHotspots: false });
            showError(err);
            return of(initHotspotResult);
          })
        );
      },
    })
  ),
  withMethods((store) => ({
    updateFilter(filter: Partial<HotspotFilter>) {
      patchState(store, (state) => ({
        filter: {
          ...state.filter,
          ...filter,
        },
      }));
    },

    rxLoadAggregated: rxMethod<LoadAggregateOptions>(
      pipe(
        switchMap((combi) => store._loadAggregated(combi)),
        tap((aggregatedResult) => patchState(store, { aggregatedResult }))
      )
    ),

    rxLoadHotspots: rxMethod<LoadHotspotOptions>(
      pipe(
        filter((combi) => !!combi.selectedModule),
        switchMap((combi) => store._loadHotspots(combi)),
        tap((hotspotResult) => patchState(store, { hotspotResult }))
      )
    ),
  }))
);

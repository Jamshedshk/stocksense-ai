% StockSense AI — Inventory Logic Rules
% Compatible with SWI-Prolog

:- dynamic product/5.
% product(Sku, CurrentStock, ReorderThreshold, LeadTimeDays, DailyDemand).

% Rule 1: Stock is strictly below reorder threshold
stock_below_threshold(Sku) :-
    product(Sku, CurrentStock, Threshold, _, _),
    CurrentStock =< Threshold.

% Rule 2: Critical stockout: stock is zero or near zero
critical_shortage(Sku) :-
    product(Sku, CurrentStock, _, _, DailyDemand),
    (CurrentStock =:= 0 ; (DailyDemand > 0, CurrentStock / DailyDemand < 2.0)).

% Rule 3: Supplier lead time exceeds stock coverage days
lead_time_exceeds_cover(Sku) :-
    product(Sku, CurrentStock, _, LeadTimeDays, DailyDemand),
    DailyDemand > 0,
    CoverDays is CurrentStock / DailyDemand,
    LeadTimeDays >= CoverDays.

% Rule 4: Overstock warning (cover exceeds 90 days and stock > threshold * 3)
overstock_review(Sku) :-
    product(Sku, CurrentStock, Threshold, _, DailyDemand),
    DailyDemand > 0,
    CoverDays is CurrentStock / DailyDemand,
    CoverDays > 90.0,
    CurrentStock > Threshold * 3.

% Master Reorder Required Rule with Reason
reorder_required(Sku, 'Critical Shortage: Stock near zero') :-
    critical_shortage(Sku).

reorder_required(Sku, 'Lead time exceeds stock coverage') :-
    lead_time_exceeds_cover(Sku),
    \+ critical_shortage(Sku).

reorder_required(Sku, 'Stock below safety reorder threshold') :-
    stock_below_threshold(Sku),
    \+ critical_shortage(Sku),
    \+ lead_time_exceeds_cover(Sku).

% Calculate recommended order quantity in Prolog
suggested_order_qty(Sku, Qty) :-
    product(Sku, CurrentStock, Threshold, LeadTimeDays, DailyDemand),
    reorder_required(Sku, _),
    SafetyStock is ceiling(DailyDemand * LeadTimeDays * 0.5),
    TargetStock is Threshold + ceiling(DailyDemand * LeadTimeDays) + SafetyStock,
    RawQty is TargetStock - CurrentStock,
    (RawQty > 0 -> Qty is RawQty ; Qty is 10).

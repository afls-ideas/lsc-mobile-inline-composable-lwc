import { LightningElement, api, wire } from 'lwc';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';

/**
 * lscMobileInline_relatedList
 *
 * A SELF-CONTAINED, reusable data brick. Given a parent record and a related
 * list, it queries the child records itself (offline-capable
 * getRelatedListRecords — no Apex) and renders them as a compact, tappable
 * mobile list. It knows nothing about HCPs, Tasks, or Cases — the PARENT
 * configures WHAT to query and HOW to label each row entirely through props.
 *
 * This is the composable unit: the same component queries different objects in
 * different parents. Props down, events up, plus a <slot> for injected markup.
 *
 * Public API (props down):
 *   @api parentRecordId  - record whose children to load (e.g. the HCP Account)
 *   @api relatedListId   - API name of the related list (e.g. "Tasks", "Cases")
 *   @api fields          - qualified field names to fetch (e.g. ["Task.Subject"])
 *   @api titleField      - field whose value is the row's primary text
 *   @api subtitleField   - optional field shown as secondary text
 *   @api badgeField      - optional field shown as a right-aligned badge
 *   @api sortBy          - optional qualified field(s) to sort by
 *   @api pageSize        - max rows to fetch (default 50)
 *   @api iconName        - SLDS icon for the card header
 *   @api title           - card header title
 *
 * Events (up):
 *   recordselect - fired on row tap. detail = { recordId, record }
 *   dataloaded   - fired when records resolve. detail = { records, count }
 *
 * Slot:
 *   default <slot> renders above the list, so a parent can inject a summary,
 *   an alert banner, filters, etc.
 */
export default class LscMobileInline_relatedList extends LightningElement {
    @api parentRecordId;
    @api relatedListId;
    @api titleField;
    @api subtitleField;
    @api badgeField;
    @api iconName = 'standard:record';
    @api title = 'Related Records';

    _fields = [];
    _sortBy;
    _pageSize = 50;

    @api
    get fields() {
        return this._fields;
    }
    set fields(val) {
        this._fields = Array.isArray(val) ? val : [];
    }

    @api
    get sortBy() {
        return this._sortBy;
    }
    set sortBy(val) {
        this._sortBy = Array.isArray(val) ? val : val ? [val] : undefined;
    }

    @api
    get pageSize() {
        return this._pageSize;
    }
    set pageSize(val) {
        const num = Number(val);
        this._pageSize = num > 0 ? num : 50;
    }

    rows = [];
    error;
    loaded = false;

    // The reusable query. Every wire input is driven by a public prop, so each
    // parent gets a completely different result from the same component.
    @wire(getRelatedListRecords, {
        parentRecordId: '$parentRecordId',
        relatedListId: '$relatedListId',
        fields: '$fields',
        sortBy: '$sortBy',
        pageSize: '$pageSize'
    })
    wiredRecords({ data, error }) {
        if (data) {
            this.rows = this.shapeRows(data.records);
            this.error = undefined;
            this.loaded = true;
            this.dispatchEvent(
                new CustomEvent('dataloaded', {
                    detail: { records: data.records, count: data.records.length }
                })
            );
        } else if (error) {
            this.error = this.reduceError(error);
            this.rows = [];
            this.loaded = true;
        }
    }

    // Flatten each UI-API record into a simple view model the template renders.
    shapeRows(records) {
        return records.map((rec) => ({
            id: rec.id,
            title: this.readField(rec, this.titleField),
            subtitle: this.subtitleField ? this.readField(rec, this.subtitleField) : null,
            badge: this.badgeField ? this.readField(rec, this.badgeField) : null,
            record: rec
        }));
    }

    // getRelatedListRecords returns values at record.fields.<ApiName>.value.
    // titleField may be qualified ("Task.Subject") — strip the object prefix.
    readField(rec, qualifiedField) {
        if (!qualifiedField) {
            return '';
        }
        const apiName = qualifiedField.includes('.')
            ? qualifiedField.split('.').pop()
            : qualifiedField;
        const field = rec.fields?.[apiName];
        return field?.displayValue ?? field?.value ?? '';
    }

    get hasRows() {
        return this.rows.length > 0;
    }

    get isEmpty() {
        return this.loaded && !this.error && this.rows.length === 0;
    }

    get cardTitle() {
        return this.loaded && !this.error ? `${this.title} (${this.rows.length})` : this.title;
    }

    handleRowSelect(event) {
        const recordId = event.currentTarget.dataset.id;
        const row = this.rows.find((r) => r.id === recordId);
        this.dispatchEvent(
            new CustomEvent('recordselect', {
                detail: { recordId, record: row?.record }
            })
        );
    }

    reduceError(error) {
        return (
            error?.body?.message ||
            error?.message ||
            'Unable to load related records.'
        );
    }
}

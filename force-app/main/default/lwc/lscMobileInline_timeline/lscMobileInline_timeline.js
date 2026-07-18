import { LightningElement, api, wire } from 'lwc';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';

/**
 * lscMobileInline_timeline
 *
 * A SECOND reusable, self-querying data brick — a sibling to
 * lscMobileInline_relatedList. Given the same style of configuration (parent
 * record + related list + fields), it queries the child records itself
 * (offline-capable getRelatedListRecords, no Apex) and plots them along a
 * horizontal timeline: one status-colored dot per record on a shared axis,
 * with a compact card above each dot showing title, date, and status.
 *
 * Designed to sit ON TOP of the related list in a parent container: it fills
 * the width and scrolls horizontally, but is height-capped so a list fits
 * beneath it on an iPad.
 *
 * Public API (props down) — mirrors the related list, plus a date field:
 *   @api parentRecordId  - record whose children to plot
 *   @api relatedListId   - API name of the related list (e.g. "Visits")
 *   @api fields          - qualified field names to fetch
 *   @api titleField      - field for each node's primary text
 *   @api dateField       - field used for the node's date label / ordering
 *   @api badgeField      - field driving the status color + badge text
 *   @api sortBy          - optional qualified field(s) to sort by
 *   @api pageSize        - max nodes to fetch (default 50)
 *   @api iconName        - SLDS icon for the card header
 *   @api title           - card header title
 *
 * Events (up):
 *   nodeselect - fired when a node is tapped. detail = { recordId, record }
 *   dataloaded - fired when records resolve. detail = { records, count }
 */
export default class LscMobileInline_timeline extends LightningElement {
    @api parentRecordId;
    @api relatedListId;
    @api titleField;
    @api dateField;
    @api badgeField;
    @api iconName = 'standard:events';
    @api title = 'Timeline';

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

    nodes = [];
    error;
    loaded = false;

    // Same reusable query as the related list — driven entirely by props.
    @wire(getRelatedListRecords, {
        parentRecordId: '$parentRecordId',
        relatedListId: '$relatedListId',
        fields: '$fields',
        sortBy: '$sortBy',
        pageSize: '$pageSize'
    })
    wiredRecords({ data, error }) {
        if (data) {
            this.nodes = this.buildNodes(data.records);
            this.error = undefined;
            this.loaded = true;
            this.dispatchEvent(
                new CustomEvent('dataloaded', {
                    detail: { records: data.records, count: data.records.length }
                })
            );
        } else if (error) {
            this.error = this.reduceError(error);
            this.nodes = [];
            this.loaded = true;
        }
    }

    // Shape each UI-API record into a timeline node view model.
    buildNodes(records) {
        return records.map((rec) => {
            const status = this.readField(rec, this.badgeField);
            return {
                id: rec.id,
                title: this.readField(rec, this.titleField),
                dateLabel: this.readDate(rec, this.dateField),
                status,
                dotClass: `tl-dot tl-dot_${this.severity(status)}`,
                record: rec
            };
        });
    }

    // Map a status string to a severity used for the dot color.
    severity(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('escalat') || s.includes('overdue') || s.includes('cancel')) {
            return 'critical';
        }
        if (s.includes('new') || s.includes('planned') || s.includes('progress') || s.includes('open')) {
            return 'warning';
        }
        if (s.includes('complete') || s.includes('closed') || s.includes('submitted')) {
            return 'success';
        }
        return 'neutral';
    }

    // getRelatedListRecords returns values at record.fields.<ApiName>.value.
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

    // Prefer the UI-API displayValue (already locale-formatted) for dates;
    // fall back to a short date derived from the raw value.
    readDate(rec, qualifiedField) {
        if (!qualifiedField) {
            return '';
        }
        const apiName = qualifiedField.includes('.')
            ? qualifiedField.split('.').pop()
            : qualifiedField;
        const field = rec.fields?.[apiName];
        if (!field) {
            return '';
        }
        if (field.displayValue) {
            return field.displayValue;
        }
        const raw = field.value;
        if (!raw) {
            return '';
        }
        // raw is an ISO date/datetime; take the date portion for compactness.
        return typeof raw === 'string' ? raw.split('T')[0] : `${raw}`;
    }

    get hasNodes() {
        return this.nodes.length > 0;
    }

    get isEmpty() {
        return this.loaded && !this.error && this.nodes.length === 0;
    }

    get cardTitle() {
        return this.loaded && !this.error ? `${this.title} (${this.nodes.length})` : this.title;
    }

    handleNodeSelect(event) {
        const recordId = event.currentTarget.dataset.id;
        const node = this.nodes.find((n) => n.id === recordId);
        this.dispatchEvent(
            new CustomEvent('nodeselect', {
                detail: { recordId, record: node?.record }
            })
        );
    }

    reduceError(error) {
        return error?.body?.message || error?.message || 'Unable to load timeline.';
    }
}

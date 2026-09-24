import { createElement } from 'lwc';
import LscMobileInlineTimeline from 'c/lscMobileInline_timeline';
import { graphql } from 'lightning/uiGraphQLApi';

// Build a GraphQL-shaped child node: values live at <Api>.value/.displayValue.
function gqlRecord(id, fields) {
    const node = { Id: id };
    Object.keys(fields).forEach((key) => {
        node[key] = { value: fields[key], displayValue: null };
    });
    return node;
}

// Build a uiapi GraphQL response nesting child nodes under
// query.<parentObjectApiName>.edges[0].node.<relatedListId>.edges[].node.
function gqlResponse(parentObjectApiName, relatedListId, nodes) {
    return {
        uiapi: {
            query: {
                [parentObjectApiName]: {
                    edges: [
                        {
                            node: {
                                Id: 'parent-id',
                                [relatedListId]: {
                                    edges: nodes.map((node) => ({ node }))
                                }
                            }
                        }
                    ]
                }
            }
        }
    };
}

// The real graphql wire adapter emits { data, errors } (errors plural).
function emitData(data) {
    graphql.emit({ data, errors: undefined });
}
function emitErrors(message) {
    graphql.emit({ data: undefined, errors: [{ message }] });
}

function createComponent(props = {}) {
    const el = createElement('c-lsc-mobile-inline_timeline', {
        is: LscMobileInlineTimeline
    });
    Object.assign(el, { parentRecordId: '001x1', parentObjectApiName: 'Account', relatedListId: 'Visits' }, props);
    document.body.appendChild(el);
    return el;
}

async function flush() {
    return Promise.resolve();
}

describe('c-lsc-mobile-inline_timeline', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('plots one node per record with title, date, and status', async () => {
        const el = createComponent({
            titleField: 'Visit.Name',
            dateField: 'Visit.PlannedVisitStartTime',
            badgeField: 'Visit.Status'
        });
        await flush();

        emitData(
            gqlResponse('Account', 'Visits', [
                gqlRecord('0aVx1', { Name: 'Q1 Detail', PlannedVisitStartTime: '2026-01-15T10:00:00.000Z', Status: 'Completed' }),
                gqlRecord('0aVx2', { Name: 'Q2 Detail', PlannedVisitStartTime: '2026-04-15T10:00:00.000Z', Status: 'Planned' })
            ])
        );
        await flush();

        const nodes = el.shadowRoot.querySelectorAll('.tl-node');
        expect(nodes).toHaveLength(2);
        expect(nodes[0].querySelector('.tl-card__title').textContent).toBe('Q1 Detail');
        expect(nodes[0].querySelector('.tl-card__date').textContent).toBe('2026-01-15');
        expect(nodes[0].querySelector('.tl-card__status').textContent).toBe('Completed');
    });

    it('colors each dot by status severity', async () => {
        const el = createComponent({
            relatedListId: 'Cases',
            titleField: 'Case.Subject',
            dateField: 'Case.CreatedDate',
            badgeField: 'Case.Status'
        });
        await flush();

        emitData(
            gqlResponse('Account', 'Cases', [
                gqlRecord('500x1', { Subject: 'A', CreatedDate: '2026-01-01', Status: 'Escalated' }),
                gqlRecord('500x2', { Subject: 'B', CreatedDate: '2026-01-02', Status: 'New' }),
                gqlRecord('500x3', { Subject: 'C', CreatedDate: '2026-01-03', Status: 'Closed' })
            ])
        );
        await flush();

        const dots = el.shadowRoot.querySelectorAll('.tl-dot');
        expect(dots[0].className).toContain('tl-dot_critical');
        expect(dots[1].className).toContain('tl-dot_warning');
        expect(dots[2].className).toContain('tl-dot_success');
    });

    it('dispatches nodeselect with the tapped record id', async () => {
        const el = createComponent({
            relatedListId: 'Cases',
            titleField: 'Case.Subject',
            dateField: 'Case.CreatedDate',
            badgeField: 'Case.Status'
        });
        const handler = jest.fn();
        el.addEventListener('nodeselect', handler);
        await flush();

        emitData(
            gqlResponse('Account', 'Cases', [gqlRecord('500xZ', { Subject: 'Tap me', CreatedDate: '2026-01-01', Status: 'New' })])
        );
        await flush();

        el.shadowRoot.querySelector('.tl-node').click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.recordId).toBe('500xZ');
    });

    it('dispatches dataloaded with the raw records and count', async () => {
        const el = createComponent({ titleField: 'Visit.Name', dateField: 'Visit.PlannedVisitStartTime', badgeField: 'Visit.Status' });
        const handler = jest.fn();
        el.addEventListener('dataloaded', handler);
        await flush();

        emitData(
            gqlResponse('Account', 'Visits', [gqlRecord('0aVx1', { Name: 'V', PlannedVisitStartTime: '2026-01-01', Status: 'Planned' })])
        );
        await flush();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.count).toBe(1);
    });

    it('prefers displayValue for the date when present', async () => {
        const el = createComponent({ titleField: 'Visit.Name', dateField: 'Visit.PlannedVisitStartTime', badgeField: 'Visit.Status' });
        await flush();

        const rec = {
            Id: '0aVxD',
            Name: { value: 'Formatted', displayValue: null },
            PlannedVisitStartTime: { value: '2026-01-15T10:00:00.000Z', displayValue: 'Jan 15, 2026' },
            Status: { value: 'Completed', displayValue: null }
        };
        emitData(gqlResponse('Account', 'Visits', [rec]));
        await flush();

        expect(el.shadowRoot.querySelector('.tl-card__date').textContent).toBe('Jan 15, 2026');
    });

    it('renders an empty state when there are no records', async () => {
        const el = createComponent({
            relatedListId: 'Cases',
            titleField: 'Case.Subject',
            dateField: 'Case.CreatedDate',
            badgeField: 'Case.Status'
        });
        await flush();

        emitData(gqlResponse('Account', 'Cases', []));
        await flush();

        expect(el.shadowRoot.querySelectorAll('.tl-node')).toHaveLength(0);
        expect(el.shadowRoot.textContent).toContain('Nothing to plot yet.');
    });

    it('renders an error message when the wire errors', async () => {
        const el = createComponent({
            relatedListId: 'Cases',
            titleField: 'Case.Subject',
            dateField: 'Case.CreatedDate',
            badgeField: 'Case.Status'
        });
        await flush();

        emitErrors('Related list not found');
        await flush();

        expect(el.shadowRoot.querySelector('.slds-text-color_error').textContent).toContain(
            'Related list not found'
        );
    });
});

import React, { SyntheticEvent } from 'react';

import { Button, HorizontalGroup, IconButton, LoadingPlaceholder, VerticalGroup } from '@grafana/ui';
import cn from 'classnames/bind';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import qs from 'query-string';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import Avatar from 'components/Avatar/Avatar';
import NewScheduleSelector from 'components/NewScheduleSelector/NewScheduleSelector';
import PluginLink from 'components/PluginLink/PluginLink';
import Table from 'components/Table/Table';
import Text from 'components/Text/Text';
import TextEllipsisTooltip from 'components/TextEllipsisTooltip/TextEllipsisTooltip';
import TimelineMarks from 'components/TimelineMarks/TimelineMarks';
import TooltipBadge from 'components/TooltipBadge/TooltipBadge';
import UserTimezoneSelect from 'components/UserTimezoneSelect/UserTimezoneSelect';
import WithConfirm from 'components/WithConfirm/WithConfirm';
import RemoteFilters from 'containers/RemoteFilters/RemoteFilters';
import { RemoteFiltersType } from 'containers/RemoteFilters/RemoteFilters.types';
import ScheduleFinal from 'containers/Rotations/ScheduleFinal';
import SchedulePersonal from 'containers/Rotations/SchedulePersonal';
import ScheduleForm from 'containers/ScheduleForm/ScheduleForm';
import TeamName from 'containers/TeamName/TeamName';
import { WithPermissionControlTooltip } from 'containers/WithPermissionControl/WithPermissionControlTooltip';
import { Schedule } from 'models/schedule/schedule.types';
import { getSlackChannelName } from 'models/slack_channel/slack_channel.helpers';
import { Timezone } from 'models/timezone/timezone.types';
import { getStartOfWeek } from 'pages/schedule/Schedule.helpers';
import { WithStoreProps, PageProps } from 'state/types';
import { withMobXProviderContext } from 'state/withStore';
import LocationHelper from 'utils/LocationHelper';
import { UserActions } from 'utils/authorization';
import { PAGE, PLUGIN_ROOT, TEXT_ELLIPSIS_CLASS } from 'utils/consts';

import styles from './Schedules.module.css';

const cx = cn.bind(styles);
const PAGE_SIZE_DEFAULT = 15;

interface SchedulesPageProps extends WithStoreProps, RouteComponentProps, PageProps {}

interface SchedulesPageState {
  startMoment: dayjs.Dayjs;
  filters: RemoteFiltersType;
  showNewScheduleSelector: boolean;
  expandedRowKeys: Array<Schedule['id']>;
  scheduleIdToEdit?: Schedule['id'];
  page: number;
}

@observer
class SchedulesPage extends React.Component<SchedulesPageProps, SchedulesPageState> {
  constructor(props: SchedulesPageProps) {
    super(props);

    const { store } = this.props;

    this.state = {
      startMoment: getStartOfWeek(store.currentTimezone),
      filters: { searchTerm: '', type: undefined, used: undefined, mine: undefined },
      showNewScheduleSelector: false,
      expandedRowKeys: [],
      scheduleIdToEdit: undefined,
      page: !isNaN(Number(props.query.p)) ? Number(props.query.p) : 1,
    };
  }

  componentDidMount(): void {
    const {
      store: { userStore },
    } = this.props;

    userStore.updateItems();
  }

  render() {
    const { store, query } = this.props;

    const { showNewScheduleSelector, expandedRowKeys, scheduleIdToEdit, page, startMoment } = this.state;

    const { results, count, page_size } = store.scheduleStore.getSearchResult();

    const users = store.userStore.getSearchResult().results;

    return (
      <>
        <div className={cx('root')}>
          <div className={cx('title')}>
            <HorizontalGroup justify="space-between">
              <Text.Title level={3}>Schedules</Text.Title>
              <div className={cx('schedules__actions')}>
                {users && (
                  <UserTimezoneSelect
                    value={store.currentTimezone}
                    users={users}
                    onChange={this.handleTimezoneChange}
                  />
                )}
                <WithPermissionControlTooltip userAction={UserActions.SchedulesWrite}>
                  <Button variant="primary" onClick={this.handleCreateScheduleClick}>
                    + New schedule
                  </Button>
                </WithPermissionControlTooltip>
              </div>
            </HorizontalGroup>
          </div>
          <div className={cx('schedule', 'schedule-personal')}>
            <SchedulePersonal
              userPk={store.userStore.currentUserPk}
              currentTimezone={store.currentTimezone}
              startMoment={startMoment}
            />
          </div>
          <div className={cx('schedules__filters-container')}>
            <RemoteFilters
              query={query}
              page={PAGE.Schedules}
              grafanaTeamStore={store.grafanaTeamStore}
              onChange={(filters, isOnMount: boolean, invalidateFn: () => boolean) => {
                this.handleSchedulesFiltersChange(filters, isOnMount, invalidateFn);
              }}
            />
          </div>

          <Table
            columns={this.getTableColumns()}
            data={results}
            loading={!results}
            pagination={{
              page,
              total: Math.ceil((count || 0) / (page_size || PAGE_SIZE_DEFAULT)),
              onChange: this.handlePageChange,
            }}
            rowKey="id"
            expandable={{
              expandedRowKeys: expandedRowKeys,
              onExpand: this.handleExpandRow,
              expandedRowRender: this.renderSchedule,
              expandRowByClick: true,
            }}
            emptyText={results === undefined ? 'Loading...' : this.renderNotFound()}
          />
        </div>

        {showNewScheduleSelector && (
          <NewScheduleSelector
            onCreate={this.handleCreateSchedule}
            onHide={() => {
              this.setState({ showNewScheduleSelector: false });
            }}
          />
        )}
        {scheduleIdToEdit && (
          <ScheduleForm
            id={scheduleIdToEdit}
            onSubmit={this.update}
            onHide={() => {
              this.setState({ scheduleIdToEdit: undefined });
            }}
          />
        )}
      </>
    );
  }

  renderNotFound() {
    return (
      <div className={cx('loader')}>
        <Text type="secondary">Not found</Text>
      </div>
    );
  }

  handleTimezoneChange = (value: Timezone) => {
    const { store } = this.props;

    store.currentTimezone = value;

    this.setState({ startMoment: getStartOfWeek(value) }, this.updateEvents);
  };

  handleCreateScheduleClick = () => {
    this.setState({ showNewScheduleSelector: true });
  };

  handleCreateSchedule = (data: Schedule) => {
    const { history, query } = this.props;

    history.push(`${PLUGIN_ROOT}/schedules/${data.id}?${qs.stringify(query)}`);
  };

  handleExpandRow = (expanded: boolean, data: Schedule) => {
    const { expandedRowKeys } = this.state;

    if (expanded && !expandedRowKeys.includes(data.id)) {
      this.setState({ expandedRowKeys: [...this.state.expandedRowKeys, data.id] }, this.updateEvents);
    } else if (!expanded && expandedRowKeys.includes(data.id)) {
      const index = expandedRowKeys.indexOf(data.id);
      const newExpandedRowKeys = [...expandedRowKeys];
      newExpandedRowKeys.splice(index, 1);
      this.setState({ expandedRowKeys: newExpandedRowKeys }, this.updateEvents);
    }
  };

  updateEvents = () => {
    const { store } = this.props;
    const { expandedRowKeys, startMoment } = this.state;

    expandedRowKeys.forEach((scheduleId) => {
      store.scheduleStore.updateEvents(scheduleId, startMoment, 'rotation');
      store.scheduleStore.updateEvents(scheduleId, startMoment, 'override');
      store.scheduleStore.updateEvents(scheduleId, startMoment, 'final');
    });
  };

  renderSchedule = (data: Schedule) => {
    const { startMoment } = this.state;
    const { store } = this.props;

    return (
      <div className={cx('schedule')}>
        <TimelineMarks startMoment={startMoment} timezone={store.currentTimezone} />
        <div className={cx('rotations')}>
          <ScheduleFinal
            simplified
            scheduleId={data.id}
            currentTimezone={store.currentTimezone}
            startMoment={startMoment}
            onSlotClick={this.getScheduleClickHandler(data.id)}
          />
        </div>
      </div>
    );
  };

  getScheduleClickHandler = (scheduleId: Schedule['id']) => {
    const { history, query } = this.props;

    return () => history.push(`${PLUGIN_ROOT}/schedules/${scheduleId}?${qs.stringify(query)}`);
  };

  renderType = (value: number) => {
    type tTypeToVerbal = {
      [key: number]: string;
    };
    const typeToVerbal: tTypeToVerbal = { 0: 'API/Terraform', 1: 'Ical', 2: 'Web' };
    return typeToVerbal[value];
  };

  renderStatus = (item: Schedule) => {
    const {
      store: { scheduleStore },
    } = this.props;

    const relatedEscalationChains = scheduleStore.relatedEscalationChains[item.id];
    return (
      <HorizontalGroup>
        {item.number_of_escalation_chains > 0 && (
          <TooltipBadge
            borderType="success"
            icon="link"
            text={item.number_of_escalation_chains}
            tooltipTitle="Used in escalations"
            tooltipContent={
              <VerticalGroup spacing="sm">
                {relatedEscalationChains ? (
                  relatedEscalationChains.length ? (
                    relatedEscalationChains.map((escalationChain) => (
                      <div key={escalationChain.pk}>
                        <PluginLink query={{ page: 'escalations', id: escalationChain.pk }} className="link">
                          <Text type="link">{escalationChain.name}</Text>
                        </PluginLink>
                      </div>
                    ))
                  ) : (
                    'Not used yet'
                  )
                ) : (
                  <LoadingPlaceholder text="Loading related escalation chains..." />
                )}
              </VerticalGroup>
            }
            onHover={this.getUpdateRelatedEscalationChainsHandler(item.id)}
          />
        )}

        {item.warnings?.length > 0 && (
          <TooltipBadge
            borderType="warning"
            icon="exclamation-triangle"
            text={item.warnings.length}
            tooltipTitle="Warnings"
            tooltipContent={
              <VerticalGroup spacing="none">
                {item.warnings.map((warning, index) => (
                  <Text type="primary" key={index}>
                    {warning}
                  </Text>
                ))}
              </VerticalGroup>
            }
          />
        )}
      </HorizontalGroup>
    );
  };

  renderName = (item: Schedule) => {
    const { query } = this.props;

    return <PluginLink query={{ page: 'schedules', id: item.id, ...query }}>{item.name}</PluginLink>;
  };

  renderOncallNow = (item: Schedule, _index: number) => {
    if (item.on_call_now?.length > 0) {
      return (
        <div className="table__email-column">
          <VerticalGroup>
            {item.on_call_now.map((user) => {
              return (
                <PluginLink key={user.pk} query={{ page: 'users', id: user.pk }} className="table__email-content">
                  <HorizontalGroup>
                    <TextEllipsisTooltip placement="top" content={user.username}>
                      <Text type="secondary" className={cx(TEXT_ELLIPSIS_CLASS)}>
                        <Avatar size="small" src={user.avatar} />{' '}
                        <span className={cx('break-word')}>{user.username}</span>
                      </Text>
                    </TextEllipsisTooltip>
                  </HorizontalGroup>
                </PluginLink>
              );
            })}
          </VerticalGroup>
        </div>
      );
    }
    return null;
  };

  renderChannelName = (value: Schedule) => {
    return getSlackChannelName(value.slack_channel) || '-';
  };

  renderUserGroup = (value: Schedule) => {
    return value.user_group?.handle || '-';
  };

  renderTeam(record: Schedule, teams: any) {
    return <TeamName team={teams[record.team]} />;
  }

  renderButtons = (item: Schedule) => {
    return (
      /* Wrapper div for onClick event to prevent expanding schedule view on delete/edit click */
      <div onClick={(event: SyntheticEvent) => event.stopPropagation()}>
        <HorizontalGroup>
          <WithPermissionControlTooltip key="edit" userAction={UserActions.SchedulesWrite}>
            <IconButton tooltip="Settings" name="cog" onClick={this.getEditScheduleClickHandler(item.id)} />
          </WithPermissionControlTooltip>
          <WithPermissionControlTooltip key="edit" userAction={UserActions.SchedulesWrite}>
            <WithConfirm>
              <IconButton tooltip="Delete" name="trash-alt" onClick={this.getDeleteScheduleClickHandler(item.id)} />
            </WithConfirm>
          </WithPermissionControlTooltip>
        </HorizontalGroup>
      </div>
    );
  };

  getEditScheduleClickHandler = (id: Schedule['id']) => {
    return () => {
      this.setState({ scheduleIdToEdit: id });
    };
  };

  getDeleteScheduleClickHandler = (id: Schedule['id']) => {
    const { store } = this.props;
    const { scheduleStore } = store;

    return () => {
      scheduleStore.delete(id).then(() => this.update());
    };
  };

  handleSchedulesFiltersChange = (filters: RemoteFiltersType, isOnMount: boolean, invalidateFn: () => boolean) => {
    this.setState({ filters, page: isOnMount ? this.state.page : 1 }, () => {
      this.applyFilters(invalidateFn);
    });
  };

  applyFilters = (invalidateFn?: () => boolean) => {
    const { scheduleStore } = this.props.store;
    const { page, filters } = this.state;

    LocationHelper.update({ p: page }, 'partial');
    scheduleStore.updateItems(filters, page, invalidateFn);
  };

  handlePageChange = (page: number) => {
    this.setState({ page, expandedRowKeys: [] }, this.applyFilters);
  };

  update = () => {
    const { store } = this.props;
    const { page, startMoment } = this.state;

    store.scheduleStore.updatePersonalEvents(store.userStore.currentUserPk, startMoment, 9, true);

    // For removal we need to check if count is 1, which means we should change the page to the previous one
    const { results } = store.scheduleStore.getSearchResult();
    const newPage = results.length === 1 ? Math.max(page - 1, 1) : page;

    this.handlePageChange(newPage);
  };

  getUpdateRelatedEscalationChainsHandler = (scheduleId: Schedule['id']) => {
    const { store } = this.props;
    const { scheduleStore } = store;

    return () => {
      scheduleStore.updateRelatedEscalationChains(scheduleId).then(() => {
        this.forceUpdate();
      });
    };
  };

  getTableColumns = () => {
    const { grafanaTeamStore } = this.props.store;

    return [
      {
        width: '10%',
        title: 'Type',
        dataIndex: 'type',
        render: this.renderType,
      },
      {
        width: '10%',
        title: 'Status',
        key: 'name',
        render: (item: Schedule) => this.renderStatus(item),
      },
      {
        width: '25%',
        title: 'Name',
        key: 'name',
        render: this.renderName,
      },
      {
        width: '25%',
        title: 'On-call now',
        key: 'users',
        render: this.renderOncallNow,
      },
      {
        width: '10%',
        title: 'Slack channel',
        render: this.renderChannelName,
      },
      {
        width: '10%',
        title: 'Slack user group',
        render: this.renderUserGroup,
      },
      {
        width: '20%',
        title: 'Team',
        render: (item: Schedule) => this.renderTeam(item, grafanaTeamStore.items),
      },
      {
        width: '50px',
        key: 'buttons',
        render: this.renderButtons,
        className: cx('buttons'),
      },
    ];
  };
}

export default withRouter(withMobXProviderContext(SchedulesPage));

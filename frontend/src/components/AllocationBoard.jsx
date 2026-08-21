import React, { useState } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemTypes = { TASK: 'task' };

const DraggableTask = ({ task }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { task, originalDevId: task.developer_id },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  const getComplexityColor = (complexity) => {
    const c = complexity?.toLowerCase();
    if (c === 'high') return '#fee2e2';
    if (c === 'medium') return '#fed7aa';
    return '#d1fae5';
  };

  return (
    <div 
      ref={drag} 
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: getComplexityColor(task.predicted_complexity),
        padding: '12px',
        marginBottom: '8px',
        borderRadius: '12px',
        cursor: 'move',
        transition: 'all 0.2s ease',
        border: '1px solid rgba(0, 0, 0, 0.05)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <strong>{task.story_id}</strong>
        <span style={{ fontSize: '11px', fontWeight: '600', background: 'rgba(0, 0, 0, 0.05)', padding: '2px 8px', borderRadius: '12px' }}>
          {task.allocated_hours}h
        </span>
      </div>
      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
        {task.predicted_complexity}
      </div>
    </div>
  );
};

const DeveloperColumn = ({ developer, tasks, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item) => onDrop(item.task, item.originalDevId, developer.id),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const used = tasks.reduce((sum, t) => sum + t.allocated_hours, 0);
  const capacity = developer.capacity_hours;
  const remaining = capacity - used;
  const utilization = (used / capacity) * 100;

  const getUtilizationColor = () => {
    if (utilization > 100) return '#fee2e2';
    if (utilization > 85) return '#fed7aa';
    return '#d1fae5';
  };

  return (
    <div 
      ref={drop} 
      style={{ 
        background: '#f8fafc',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        border: isOver ? '2px solid #667eea' : '2px solid transparent',
        backgroundColor: isOver ? '#f1f5f9' : '#f8fafc'
      }}
    >
      <div style={{ 
        padding: '16px', 
        background: `linear-gradient(135deg, ${developer.skill_level === 'senior' ? '#667eea' : '#764ba2'}, ${developer.skill_level === 'senior' ? '#764ba2' : '#667eea'})`,
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: 'rgba(255, 255, 255, 0.2)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: '700', 
            fontSize: '18px' 
          }}>
            {developer.name.charAt(0)}
          </div>
          <div>
            <strong>{developer.name}</strong>
            <div style={{ display: 'block', fontSize: '11px', opacity: 0.9, textTransform: 'capitalize' }}>
              {developer.skill_level}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Used</div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>{used}h</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Capacity</div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>{capacity}h</div>
          </div>
        </div>
      </div>
      
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ height: '6px', borderRadius: '10px', transition: 'width 0.3s ease', marginBottom: '8px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(utilization, 100)}%`, height: '100%', backgroundColor: getUtilizationColor() }} />
        </div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          {utilization.toFixed(0)}% utilized | {remaining}h remaining
        </div>
      </div>

      <div style={{ padding: '12px', minHeight: '200px' }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📭</span>
            <p style={{ fontSize: '13px' }}>No tasks assigned</p>
          </div>
        ) : (
          tasks.map(task => (
            <DraggableTask key={task.story_id} task={task} />
          ))
        )}
      </div>
    </div>
  );
};

const AllocationBoard = ({ assignments, developers, onRebalance, onSave, onTaskMove }) => {
  const grouped = {};
  assignments.forEach(a => {
    if (!grouped[a.developer_id]) grouped[a.developer_id] = [];
    grouped[a.developer_id].push(a);
  });

  const totalHours = assignments.reduce((sum, a) => sum + a.allocated_hours, 0);
  const totalCapacity = developers.reduce((sum, d) => sum + d.capacity_hours, 0);
  const balanceStatus = totalHours <= totalCapacity ? '✅ Balanced' : '⚠️ Over capacity';
  const utilization = (totalHours / totalCapacity) * 100;

  const handleDrop = (task, fromDevId, toDevId) => {
    onTaskMove(task, fromDevId, toDevId);
  };

  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '24px', marginTop: '32px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📊</span> Allocation Board
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onRebalance} 
            style={{ 
              padding: '10px 20px', 
              borderRadius: '40px', 
              fontWeight: '600', 
              fontSize: '13px', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease', 
              border: 'none',
              background: '#f1f5f9',
              color: '#475569'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔄 Rebalance (AI)
          </button>
          <button 
            onClick={onSave} 
            style={{ 
              padding: '10px 20px', 
              borderRadius: '40px', 
              fontWeight: '600', 
              fontSize: '13px', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease', 
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            💾 Save Allocation
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        {developers.map(dev => (
          <DeveloperColumn
            key={dev.id}
            developer={dev}
            tasks={grouped[dev.id] || []}
            onDrop={handleDrop}
          />
        ))}
      </div>

      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #e2e8f0' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <span style={{ fontSize: '28px' }}>📊</span>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total Work</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{totalHours}h</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <span style={{ fontSize: '28px' }}>👥</span>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total Capacity</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{totalCapacity}h</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <span style={{ fontSize: '28px' }}>📈</span>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Utilization</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{utilization.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <span style={{ fontSize: '28px' }}>⚖️</span>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Status</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: totalHours <= totalCapacity ? '#10b981' : '#ef4444' }}>
                {balanceStatus}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AllocationBoardWithDnD = (props) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <AllocationBoard {...props} />
    </DndProvider>
  );
};

export default AllocationBoardWithDnD;